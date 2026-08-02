-- CreateEnum
CREATE TYPE "BankType" AS ENUM ('BANK_A', 'BANK_B');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_OUT', 'TRANSFER_IN', 'FEE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "KhqrStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SwitchEventType" AS ENUM ('TRANSFER_INITIATED', 'TRANSFER_VALIDATED', 'TRANSFER_SETTLED', 'TRANSFER_FAILED', 'TRANSFER_REVERSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "bankType" "BankType" NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "pinHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bankType" "BankType" NOT NULL,
    "accountNumber" VARCHAR(20) NOT NULL,
    "balanceCents" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "bankType" "BankType" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" BIGINT NOT NULL,
    "balanceAfterCents" BIGINT,
    "referenceId" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "idempotencyKey" VARCHAR(100) NOT NULL,
    "senderAccountId" UUID NOT NULL,
    "receiverAccountId" UUID NOT NULL,
    "senderBankType" "BankType" NOT NULL,
    "receiverBankType" "BankType" NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "feeCents" BIGINT NOT NULL DEFAULT 0,
    "isCrossBank" BOOLEAN NOT NULL DEFAULT false,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "switchReference" VARCHAR(100),
    "description" VARCHAR(500),
    "transactionId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "khqr_payment_requests" (
    "id" UUID NOT NULL,
    "merchantAccountId" UUID NOT NULL,
    "payload" TEXT NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "KhqrStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khqr_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atm_deposits" (
    "id" UUID NOT NULL,
    "targetBankType" "BankType" NOT NULL,
    "accountNumber" VARCHAR(20) NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atm_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "switch_event_logs" (
    "id" UUID NOT NULL,
    "eventType" "SwitchEventType" NOT NULL,
    "transferId" UUID,
    "sourceModule" VARCHAR(100) NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "switch_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_bankType_idx" ON "users"("bankType");

-- CreateIndex
CREATE UNIQUE INDEX "users_bankType_phoneNumber_key" ON "users"("bankType", "phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountNumber_key" ON "accounts"("accountNumber");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "accounts_bankType_idx" ON "accounts"("bankType");

-- CreateIndex
CREATE INDEX "accounts_bankType_accountNumber_idx" ON "accounts"("bankType", "accountNumber");

-- CreateIndex
CREATE INDEX "transactions_accountId_idx" ON "transactions"("accountId");

-- CreateIndex
CREATE INDEX "transactions_bankType_idx" ON "transactions"("bankType");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_referenceId_idx" ON "transactions"("referenceId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_idempotencyKey_key" ON "transfers"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_transactionId_key" ON "transfers"("transactionId");

-- CreateIndex
CREATE INDEX "transfers_senderAccountId_idx" ON "transfers"("senderAccountId");

-- CreateIndex
CREATE INDEX "transfers_receiverAccountId_idx" ON "transfers"("receiverAccountId");

-- CreateIndex
CREATE INDEX "transfers_senderBankType_idx" ON "transfers"("senderBankType");

-- CreateIndex
CREATE INDEX "transfers_receiverBankType_idx" ON "transfers"("receiverBankType");

-- CreateIndex
CREATE INDEX "transfers_isCrossBank_idx" ON "transfers"("isCrossBank");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE INDEX "transfers_switchReference_idx" ON "transfers"("switchReference");

-- CreateIndex
CREATE INDEX "transfers_createdAt_idx" ON "transfers"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "khqr_payment_requests_payloadHash_key" ON "khqr_payment_requests"("payloadHash");

-- CreateIndex
CREATE INDEX "khqr_payment_requests_merchantAccountId_idx" ON "khqr_payment_requests"("merchantAccountId");

-- CreateIndex
CREATE INDEX "khqr_payment_requests_status_idx" ON "khqr_payment_requests"("status");

-- CreateIndex
CREATE INDEX "khqr_payment_requests_expiresAt_idx" ON "khqr_payment_requests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "atm_deposits_transactionId_key" ON "atm_deposits"("transactionId");

-- CreateIndex
CREATE INDEX "atm_deposits_targetBankType_idx" ON "atm_deposits"("targetBankType");

-- CreateIndex
CREATE INDEX "atm_deposits_accountNumber_idx" ON "atm_deposits"("accountNumber");

-- CreateIndex
CREATE INDEX "atm_deposits_status_idx" ON "atm_deposits"("status");

-- CreateIndex
CREATE INDEX "switch_event_logs_eventType_idx" ON "switch_event_logs"("eventType");

-- CreateIndex
CREATE INDEX "switch_event_logs_transferId_idx" ON "switch_event_logs"("transferId");

-- CreateIndex
CREATE INDEX "switch_event_logs_sourceModule_idx" ON "switch_event_logs"("sourceModule");

-- CreateIndex
CREATE INDEX "switch_event_logs_createdAt_idx" ON "switch_event_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_senderAccountId_fkey" FOREIGN KEY ("senderAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_receiverAccountId_fkey" FOREIGN KEY ("receiverAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "khqr_payment_requests" ADD CONSTRAINT "khqr_payment_requests_merchantAccountId_fkey" FOREIGN KEY ("merchantAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atm_deposits" ADD CONSTRAINT "atm_deposits_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "switch_event_logs" ADD CONSTRAINT "switch_event_logs_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
