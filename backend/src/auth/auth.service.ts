import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { centsToDollars, serializeBigInt } from '../common/utils/money.util';

const BCRYPT_ROUNDS = 10;

interface JwtPayload {
  sub: string; // userId
  bankType: string;
  accountId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if phone already used for this bank
    const existing = await this.prisma.user.findUnique({
      where: {
        bankType_phoneNumber: {
          bankType: dto.bankType,
          phoneNumber: dto.phoneNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Phone number already registered for this bank',
      );
    }

    const pinHash = await bcrypt.hash(dto.pin, BCRYPT_ROUNDS);

    // Generate account number
    const accountNumber = await this.generateAccountNumber(dto.bankType);

    // Create user + account in a transaction
    const { user, account } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          bankType: dto.bankType,
          phoneNumber: dto.phoneNumber,
          pinHash,
          fullName: dto.fullName,
        },
      });

      const account = await tx.account.create({
        data: {
          userId: user.id,
          bankType: dto.bankType,
          accountNumber,
          balanceCents: 0n,
          currency: 'USD',
        },
      });

      return { user, account };
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      bankType: user.bankType,
      accountId: account.id,
    });

    this.logger.log(
      `New user registered: ${user.bankType} | ${user.phoneNumber} | ${account.accountNumber}`,
    );

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        bankType: user.bankType,
      },
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        balance: 0,
        currency: account.currency,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        bankType_phoneNumber: {
          bankType: dto.bankType,
          phoneNumber: dto.phoneNumber,
        },
      },
      include: { accounts: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const pinValid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!pinValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const account = user.accounts[0];
    if (!account) {
      throw new NotFoundException('No account found for user');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      bankType: user.bankType,
      accountId: account.id,
    });

    this.logger.log(`Login: ${user.bankType} | ${user.phoneNumber}`);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        bankType: user.bankType,
      },
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        balance: centsToDollars(account.balanceCents),
        balanceCents: serializeBigInt(account.balanceCents),
        currency: account.currency,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { accounts: true } } },
    });

    if (!stored || stored.revokedAt || new Date() > stored.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const account = stored.user.accounts[0];

    // Issue new tokens
    const tokens = await this.generateTokens({
      sub: stored.userId,
      bankType: stored.user.bankType,
      accountId: account?.id ?? '',
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  // ── Private Helpers ──────────────────────────────────────────

  private async generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload);

    // Generate opaque refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + parseInt(refreshExpiresIn.replace('d', ''), 10),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
    };
  }

  private async generateAccountNumber(bankType: string): Promise<string> {
    const prefix = bankType === 'BANK_A' ? 'BA' : 'BB';

    const lastAccount = await this.prisma.account.findFirst({
      where: { accountNumber: { startsWith: prefix } },
      orderBy: { accountNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastAccount) {
      const numPart = lastAccount.accountNumber.split('-')[1];
      nextNum = parseInt(numPart, 10) + 1;
    }

    return `${prefix}-${nextNum.toString().padStart(8, '0')}`;
  }
}
