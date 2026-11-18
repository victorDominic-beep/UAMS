-- CreateEnum
CREATE TYPE "AssetLifecycleStatus" AS ENUM ('PENDING_INSCRIPTION', 'IN_STORE', 'IN_SERVICE', 'UNDER_MAINTENANCE', 'UNSERVICEABLE', 'UNDER_SURVEY', 'WRITTEN_OFF', 'DISPOSED');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'UNDER_SURVEY', 'PENDING_APPROVAL', 'WRITTEN_OFF', 'REJECTED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "SurveyItemRating" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'BEYOND_REPAIR');

-- CreateEnum
CREATE TYPE "AuthorizationDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationOutcome" AS ENUM ('VERIFIED', 'LOCATION_VARIANCE', 'MISSING', 'DAMAGE_REPORTED', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'TRANSFER', 'VERIFY', 'WRITE_OFF', 'DISPOSE', 'LOGIN', 'LOGOUT', 'ROLE_ASSIGN', 'ACCESS_CHANGE', 'OTHER');

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "staffNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "departmentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" UUID,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "painCode" TEXT NOT NULL,
    "serialNumber" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assetCategoryId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "location" TEXT,
    "acquisitionDate" DATE NOT NULL,
    "historicalCost" DECIMAL(18,2) NOT NULL,
    "salvageValue" DECIMAL(18,2) NOT NULL,
    "currentNetBookValue" DECIMAL(18,2) NOT NULL,
    "usefulLifeYears" INTEGER,
    "assetType" TEXT NOT NULL,
    "isDepreciable" BOOLEAN NOT NULL DEFAULT true,
    "status" "AssetLifecycleStatus" NOT NULL DEFAULT 'PENDING_INSCRIPTION',
    "custodianName" TEXT,
    "srvVoucherId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SRVVoucher" (
    "id" UUID NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "approverId" UUID,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "purchaseOrderNumber" TEXT,
    "invoiceNumber" TEXT,
    "vendorName" TEXT,
    "receivedDate" DATE NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SRVVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SRVLineItem" (
    "id" UUID NOT NULL,
    "srvVoucherId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "serialNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SRVLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SIVVoucher" (
    "id" UUID NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "assetId" UUID NOT NULL,
    "sourceDepartmentId" UUID NOT NULL,
    "targetDepartmentId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "approverId" UUID,
    "receiptCustodianId" UUID,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATE,
    "approvedAt" TIMESTAMP(3),
    "receiptConfirmedAt" TIMESTAMP(3),
    "receiptSignature" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SIVVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyTransfer" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "fromDepartmentId" UUID,
    "toDepartmentId" UUID,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "actorId" UUID NOT NULL,
    "approverId" UUID,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "transferredAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustodyTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "recordedById" UUID NOT NULL,
    "serviceDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "partsReplaced" TEXT,
    "expenditure" DECIMAL(18,2) NOT NULL,
    "isCapitalAddition" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalAddition" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "maintenanceId" UUID,
    "recordedById" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "status" "AuthorizationDecision" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalAddition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" UUID NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "assetId" UUID NOT NULL,
    "underwriter" TEXT NOT NULL,
    "coverageScope" TEXT NOT NULL,
    "coverageAmount" DECIMAL(18,2) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepreciationLedger" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "periodLabel" TEXT,
    "openingNBV" DECIMAL(18,2) NOT NULL,
    "depreciationAmount" DECIMAL(18,2) NOT NULL,
    "endingNBV" DECIMAL(18,2) NOT NULL,
    "processedById" UUID NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepreciationLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyDocket" (
    "id" UUID NOT NULL,
    "docketNumber" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyDocket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyItem" (
    "id" UUID NOT NULL,
    "docketId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "assessedById" UUID,
    "conditionNotes" TEXT,
    "rating" "SurveyItemRating",
    "reserveValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WriteOffAuthorization" (
    "id" UUID NOT NULL,
    "surveyItemId" UUID NOT NULL,
    "bursarApproverId" UUID,
    "bursarDecision" "AuthorizationDecision" NOT NULL DEFAULT 'PENDING',
    "bursarDecidedAt" TIMESTAMP(3),
    "vcApproverId" UUID,
    "vcDecision" "AuthorizationDecision" NOT NULL DEFAULT 'PENDING',
    "vcDecidedAt" TIMESTAMP(3),
    "status" "AuthorizationDecision" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WriteOffAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalRecord" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "recordedById" UUID NOT NULL,
    "auctionReference" TEXT,
    "proceeds" DECIMAL(18,2) NOT NULL,
    "netBookValue" DECIMAL(18,2) NOT NULL,
    "gainOrLoss" DECIMAL(18,2) NOT NULL,
    "disposedAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisposalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalVerification" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "verifierId" UUID NOT NULL,
    "observedLocation" TEXT,
    "outcome" "VerificationOutcome" NOT NULL,
    "findings" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentifierCounter" (
    "id" UUID NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "categoryCode" TEXT,
    "sequence" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentifierCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,
    "ipAddress" TEXT,
    "actionType" "AuditActionType" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "delta" JSONB,
    "prevHash" TEXT,
    "rowHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Role_name_idx" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffNumber_key" ON "User"("staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_code_key" ON "AssetCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_name_key" ON "AssetCategory"("name");

-- CreateIndex
CREATE INDEX "AssetCategory_name_idx" ON "AssetCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_painCode_key" ON "Asset"("painCode");

-- CreateIndex
CREATE INDEX "Asset_painCode_idx" ON "Asset"("painCode");

-- CreateIndex
CREATE INDEX "Asset_serialNumber_idx" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "Asset_assetCategoryId_idx" ON "Asset"("assetCategoryId");

-- CreateIndex
CREATE INDEX "Asset_departmentId_idx" ON "Asset"("departmentId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_acquisitionDate_idx" ON "Asset"("acquisitionDate");

-- CreateIndex
CREATE INDEX "Asset_srvVoucherId_idx" ON "Asset"("srvVoucherId");

-- CreateIndex
CREATE UNIQUE INDEX "SRVVoucher_voucherNumber_key" ON "SRVVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "SRVVoucher_voucherNumber_idx" ON "SRVVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "SRVVoucher_departmentId_idx" ON "SRVVoucher"("departmentId");

-- CreateIndex
CREATE INDEX "SRVVoucher_creatorId_idx" ON "SRVVoucher"("creatorId");

-- CreateIndex
CREATE INDEX "SRVVoucher_approverId_idx" ON "SRVVoucher"("approverId");

-- CreateIndex
CREATE INDEX "SRVVoucher_status_idx" ON "SRVVoucher"("status");

-- CreateIndex
CREATE INDEX "SRVVoucher_receivedDate_idx" ON "SRVVoucher"("receivedDate");

-- CreateIndex
CREATE INDEX "SRVLineItem_srvVoucherId_idx" ON "SRVLineItem"("srvVoucherId");

-- CreateIndex
CREATE INDEX "SRVLineItem_serialNumber_idx" ON "SRVLineItem"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SIVVoucher_voucherNumber_key" ON "SIVVoucher"("voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SIVVoucher_assetId_key" ON "SIVVoucher"("assetId");

-- CreateIndex
CREATE INDEX "SIVVoucher_voucherNumber_idx" ON "SIVVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "SIVVoucher_assetId_idx" ON "SIVVoucher"("assetId");

-- CreateIndex
CREATE INDEX "SIVVoucher_sourceDepartmentId_idx" ON "SIVVoucher"("sourceDepartmentId");

-- CreateIndex
CREATE INDEX "SIVVoucher_targetDepartmentId_idx" ON "SIVVoucher"("targetDepartmentId");

-- CreateIndex
CREATE INDEX "SIVVoucher_creatorId_idx" ON "SIVVoucher"("creatorId");

-- CreateIndex
CREATE INDEX "SIVVoucher_approverId_idx" ON "SIVVoucher"("approverId");

-- CreateIndex
CREATE INDEX "SIVVoucher_status_idx" ON "SIVVoucher"("status");

-- CreateIndex
CREATE INDEX "CustodyTransfer_assetId_idx" ON "CustodyTransfer"("assetId");

-- CreateIndex
CREATE INDEX "CustodyTransfer_actorId_idx" ON "CustodyTransfer"("actorId");

-- CreateIndex
CREATE INDEX "CustodyTransfer_approverId_idx" ON "CustodyTransfer"("approverId");

-- CreateIndex
CREATE INDEX "CustodyTransfer_fromDepartmentId_idx" ON "CustodyTransfer"("fromDepartmentId");

-- CreateIndex
CREATE INDEX "CustodyTransfer_toDepartmentId_idx" ON "CustodyTransfer"("toDepartmentId");

-- CreateIndex
CREATE INDEX "CustodyTransfer_status_idx" ON "CustodyTransfer"("status");

-- CreateIndex
CREATE INDEX "CustodyTransfer_transferredAt_idx" ON "CustodyTransfer"("transferredAt");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_assetId_idx" ON "MaintenanceRecord"("assetId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_recordedById_idx" ON "MaintenanceRecord"("recordedById");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_serviceDate_idx" ON "MaintenanceRecord"("serviceDate");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_isCapitalAddition_idx" ON "MaintenanceRecord"("isCapitalAddition");

-- CreateIndex
CREATE INDEX "CapitalAddition_assetId_idx" ON "CapitalAddition"("assetId");

-- CreateIndex
CREATE INDEX "CapitalAddition_maintenanceId_idx" ON "CapitalAddition"("maintenanceId");

-- CreateIndex
CREATE INDEX "CapitalAddition_recordedById_idx" ON "CapitalAddition"("recordedById");

-- CreateIndex
CREATE INDEX "CapitalAddition_status_idx" ON "CapitalAddition"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_policyNumber_key" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE INDEX "InsurancePolicy_policyNumber_idx" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE INDEX "InsurancePolicy_assetId_idx" ON "InsurancePolicy"("assetId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_expiryDate_idx" ON "InsurancePolicy"("expiryDate");

-- CreateIndex
CREATE INDEX "InsurancePolicy_createdById_idx" ON "InsurancePolicy"("createdById");

-- CreateIndex
CREATE INDEX "DepreciationLedger_assetId_idx" ON "DepreciationLedger"("assetId");

-- CreateIndex
CREATE INDEX "DepreciationLedger_fiscalYear_idx" ON "DepreciationLedger"("fiscalYear");

-- CreateIndex
CREATE INDEX "DepreciationLedger_processedById_idx" ON "DepreciationLedger"("processedById");

-- CreateIndex
CREATE INDEX "DepreciationLedger_processedAt_idx" ON "DepreciationLedger"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DepreciationLedger_assetId_fiscalYear_periodLabel_key" ON "DepreciationLedger"("assetId", "fiscalYear", "periodLabel");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyDocket_docketNumber_key" ON "SurveyDocket"("docketNumber");

-- CreateIndex
CREATE INDEX "SurveyDocket_docketNumber_idx" ON "SurveyDocket"("docketNumber");

-- CreateIndex
CREATE INDEX "SurveyDocket_status_idx" ON "SurveyDocket"("status");

-- CreateIndex
CREATE INDEX "SurveyDocket_createdById_idx" ON "SurveyDocket"("createdById");

-- CreateIndex
CREATE INDEX "SurveyItem_docketId_idx" ON "SurveyItem"("docketId");

-- CreateIndex
CREATE INDEX "SurveyItem_assetId_idx" ON "SurveyItem"("assetId");

-- CreateIndex
CREATE INDEX "SurveyItem_assessedById_idx" ON "SurveyItem"("assessedById");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyItem_docketId_assetId_key" ON "SurveyItem"("docketId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "WriteOffAuthorization_surveyItemId_key" ON "WriteOffAuthorization"("surveyItemId");

-- CreateIndex
CREATE INDEX "WriteOffAuthorization_bursarApproverId_idx" ON "WriteOffAuthorization"("bursarApproverId");

-- CreateIndex
CREATE INDEX "WriteOffAuthorization_vcApproverId_idx" ON "WriteOffAuthorization"("vcApproverId");

-- CreateIndex
CREATE INDEX "WriteOffAuthorization_status_idx" ON "WriteOffAuthorization"("status");

-- CreateIndex
CREATE INDEX "DisposalRecord_assetId_idx" ON "DisposalRecord"("assetId");

-- CreateIndex
CREATE INDEX "DisposalRecord_recordedById_idx" ON "DisposalRecord"("recordedById");

-- CreateIndex
CREATE INDEX "DisposalRecord_disposedAt_idx" ON "DisposalRecord"("disposedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DisposalRecord_assetId_key" ON "DisposalRecord"("assetId");

-- CreateIndex
CREATE INDEX "PhysicalVerification_assetId_idx" ON "PhysicalVerification"("assetId");

-- CreateIndex
CREATE INDEX "PhysicalVerification_verifierId_idx" ON "PhysicalVerification"("verifierId");

-- CreateIndex
CREATE INDEX "PhysicalVerification_verifiedAt_idx" ON "PhysicalVerification"("verifiedAt");

-- CreateIndex
CREATE INDEX "PhysicalVerification_outcome_idx" ON "PhysicalVerification"("outcome");

-- CreateIndex
CREATE INDEX "IdentifierCounter_prefix_year_idx" ON "IdentifierCounter"("prefix", "year");

-- CreateIndex
CREATE UNIQUE INDEX "IdentifierCounter_prefix_year_categoryCode_key" ON "IdentifierCounter"("prefix", "year", "categoryCode");

-- CreateIndex
CREATE INDEX "AuditTrail_timestamp_idx" ON "AuditTrail"("timestamp");

-- CreateIndex
CREATE INDEX "AuditTrail_userId_idx" ON "AuditTrail"("userId");

-- CreateIndex
CREATE INDEX "AuditTrail_actionType_idx" ON "AuditTrail"("actionType");

-- CreateIndex
CREATE INDEX "AuditTrail_entityName_idx" ON "AuditTrail"("entityName");

-- CreateIndex
CREATE INDEX "AuditTrail_entityId_idx" ON "AuditTrail"("entityId");

-- CreateIndex
CREATE INDEX "AuditTrail_prevHash_idx" ON "AuditTrail"("prevHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assetCategoryId_fkey" FOREIGN KEY ("assetCategoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_srvVoucherId_fkey" FOREIGN KEY ("srvVoucherId") REFERENCES "SRVVoucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SRVVoucher" ADD CONSTRAINT "SRVVoucher_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SRVVoucher" ADD CONSTRAINT "SRVVoucher_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SRVVoucher" ADD CONSTRAINT "SRVVoucher_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SRVLineItem" ADD CONSTRAINT "SRVLineItem_srvVoucherId_fkey" FOREIGN KEY ("srvVoucherId") REFERENCES "SRVVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVVoucher" ADD CONSTRAINT "SIVVoucher_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVVoucher" ADD CONSTRAINT "SIVVoucher_sourceDepartmentId_fkey" FOREIGN KEY ("sourceDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVVoucher" ADD CONSTRAINT "SIVVoucher_targetDepartmentId_fkey" FOREIGN KEY ("targetDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVVoucher" ADD CONSTRAINT "SIVVoucher_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVVoucher" ADD CONSTRAINT "SIVVoucher_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVVoucher" ADD CONSTRAINT "SIVVoucher_receiptCustodianId_fkey" FOREIGN KEY ("receiptCustodianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyTransfer" ADD CONSTRAINT "CustodyTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyTransfer" ADD CONSTRAINT "CustodyTransfer_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyTransfer" ADD CONSTRAINT "CustodyTransfer_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyTransfer" ADD CONSTRAINT "CustodyTransfer_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyTransfer" ADD CONSTRAINT "CustodyTransfer_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAddition" ADD CONSTRAINT "CapitalAddition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAddition" ADD CONSTRAINT "CapitalAddition_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAddition" ADD CONSTRAINT "CapitalAddition_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalAddition" ADD CONSTRAINT "CapitalAddition_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MaintenanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationLedger" ADD CONSTRAINT "DepreciationLedger_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationLedger" ADD CONSTRAINT "DepreciationLedger_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDocket" ADD CONSTRAINT "SurveyDocket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyItem" ADD CONSTRAINT "SurveyItem_docketId_fkey" FOREIGN KEY ("docketId") REFERENCES "SurveyDocket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyItem" ADD CONSTRAINT "SurveyItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyItem" ADD CONSTRAINT "SurveyItem_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOffAuthorization" ADD CONSTRAINT "WriteOffAuthorization_bursarApproverId_fkey" FOREIGN KEY ("bursarApproverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOffAuthorization" ADD CONSTRAINT "WriteOffAuthorization_vcApproverId_fkey" FOREIGN KEY ("vcApproverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOffAuthorization" ADD CONSTRAINT "WriteOffAuthorization_surveyItemId_fkey" FOREIGN KEY ("surveyItemId") REFERENCES "SurveyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRecord" ADD CONSTRAINT "DisposalRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRecord" ADD CONSTRAINT "DisposalRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalVerification" ADD CONSTRAINT "PhysicalVerification_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalVerification" ADD CONSTRAINT "PhysicalVerification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTrail" ADD CONSTRAINT "AuditTrail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
