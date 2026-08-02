import {
  BankType,
  PrismaClient,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

interface SeedUser {
  bankType: BankType;
  phoneNumber: string;
  pin: string;
  fullName: string;
  balanceCents: bigint;
  accountNumber: string;
}

const seedUsers: SeedUser[] = [
  {
    bankType: BankType.BANK_A,
    phoneNumber: '+85511111111',
    pin: '1234',
    fullName: 'Bank A User One',
    balanceCents: 100_000n,
    accountNumber: 'BA-00000001',
  },
  {
    bankType: BankType.BANK_A,
    phoneNumber: '+85511111112',
    pin: '5678',
    fullName: 'Bank A User Two',
    balanceCents: 50_000n,
    accountNumber: 'BA-00000002',
  },
  {
    bankType: BankType.BANK_B,
    phoneNumber: '+85522222221',
    pin: '1234',
    fullName: 'Bank B User One',
    balanceCents: 80_000n,
    accountNumber: 'BB-00000001',
  },
  {
    bankType: BankType.BANK_B,
    phoneNumber: '+85522222222',
    pin: '5678',
    fullName: 'Bank B User Two',
    balanceCents: 25_000n,
    accountNumber: 'BB-00000002',
  },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  for (const seed of seedUsers) {
    const pinHash = await bcrypt.hash(seed.pin, BCRYPT_ROUNDS);

    const user = await prisma.user.upsert({
      where: {
        bankType_phoneNumber: {
          bankType: seed.bankType,
          phoneNumber: seed.phoneNumber,
        },
      },
      update: {
        pinHash,
        fullName: seed.fullName,
      },
      create: {
        bankType: seed.bankType,
        phoneNumber: seed.phoneNumber,
        pinHash,
        fullName: seed.fullName,
      },
    });

    const account = await prisma.account.upsert({
      where: { accountNumber: seed.accountNumber },
      update: {
        balanceCents: seed.balanceCents,
      },
      create: {
        userId: user.id,
        bankType: seed.bankType,
        accountNumber: seed.accountNumber,
        balanceCents: seed.balanceCents,
        currency: 'USD',
      },
    });

    const existingDeposit = await prisma.transaction.findFirst({
      where: {
        accountId: account.id,
        type: TransactionType.DEPOSIT,
        referenceId: `SEED-OPENING-${seed.accountNumber}`,
      },
    });

    if (!existingDeposit) {
      await prisma.transaction.create({
        data: {
          accountId: account.id,
          bankType: seed.bankType,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amountCents: seed.balanceCents,
          balanceAfterCents: seed.balanceCents,
          referenceId: `SEED-OPENING-${seed.accountNumber}`,
          metadata: {
            source: 'seed',
            description: 'Opening deposit',
          },
        },
      });
    }

    console.log(
      `  ${seed.bankType} | ${seed.phoneNumber} | ${seed.accountNumber} | $${Number(seed.balanceCents) / 100}`,
    );
  }

  console.log('Seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
