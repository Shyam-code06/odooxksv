-- PostgreSQL Schema Setup for VendorBridge
-- All tables and columns must use strictly lowercase singular naming with no underscores, hyphens, or spaces.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role Table
CREATE TABLE IF NOT EXISTS role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permission Table
CREATE TABLE IF NOT EXISTS permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RolePermission Table (Many-to-Many Bridge)
CREATE TABLE IF NOT EXISTS rolepermission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roleid UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permissionid UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rolepermissionidunique UNIQUE (roleid, permissionid)
);

-- User Table
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phonenumber VARCHAR(50),
    username VARCHAR(100) NOT NULL UNIQUE,
    passwordhash VARCHAR(255) NOT NULL,
    roleid UUID NOT NULL REFERENCES role(id),
    isactive BOOLEAN NOT NULL DEFAULT TRUE,
    createdby UUID REFERENCES "user"(id) ON DELETE SET NULL,
    updatedby UUID REFERENCES "user"(id) ON DELETE SET NULL,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resetotp VARCHAR(6),
    resetotpexpiresat TIMESTAMP WITH TIME ZONE
);

-- Session Table
CREATE TABLE IF NOT EXISTS session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userid UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    refreshtoken TEXT NOT NULL UNIQUE,
    expiresat TIMESTAMP WITH TIME ZONE NOT NULL,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    isrevoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- AuditLog Table
CREATE TABLE IF NOT EXISTS auditlog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userid UUID REFERENCES "user"(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    oldvalue JSONB,
    newvalue JSONB,

    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SystemSetting Table
CREATE TABLE IF NOT EXISTS systemsetting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settingkey VARCHAR(100) NOT NULL UNIQUE,
    settingvalue TEXT,
    description TEXT,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedby UUID REFERENCES "user"(id) ON DELETE SET NULL
);

-- INDEXES
-- Indexing foreign keys and frequently searched columns to optimize query performance (designed for millions of records)
CREATE INDEX IF NOT EXISTS idx_user_roleid ON "user"(roleid);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_username ON "user"(username);

CREATE INDEX IF NOT EXISTS idx_rolepermission_roleid ON rolepermission(roleid);
CREATE INDEX IF NOT EXISTS idx_rolepermission_permissionid ON rolepermission(permissionid);

CREATE INDEX IF NOT EXISTS idx_session_userid ON session(userid);
CREATE INDEX IF NOT EXISTS idx_session_refreshtoken ON session(refreshtoken);

CREATE INDEX IF NOT EXISTS idx_auditlog_userid ON auditlog(userid);
CREATE INDEX IF NOT EXISTS idx_auditlog_createdat ON auditlog(createdat);

CREATE INDEX IF NOT EXISTS idx_systemsetting_key ON systemsetting(settingkey);

-- Vendor Table
CREATE TABLE IF NOT EXISTS vendor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    companyname VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    gstnumber VARCHAR(15) UNIQUE,
    pannumber VARCHAR(10) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    contactperson VARCHAR(150) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Suspended')),
    rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletedat TIMESTAMP WITH TIME ZONE
);

-- Request For Quotation (RFQ) Table
CREATE TABLE IF NOT EXISTS rfq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfqnumber VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deadline DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Published', 'Closed', 'Under Evaluation', 'Completed', 'Cancelled', 'Rejected')),
    createdby UUID REFERENCES "user"(id) ON DELETE SET NULL,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletedat TIMESTAMP WITH TIME ZONE
);

-- RFQ Vendor Bridge Table
CREATE TABLE IF NOT EXISTS rfqvendor (
    rfqid UUID REFERENCES rfq(id) ON DELETE CASCADE,
    vendorid UUID REFERENCES vendor(id) ON DELETE CASCADE,
    invitedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rfqid, vendorid)
);

-- Quotation Table
CREATE TABLE IF NOT EXISTS quotation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfqid UUID REFERENCES rfq(id) ON DELETE CASCADE,
    vendorid UUID REFERENCES vendor(id) ON DELETE CASCADE,
    totalprice DECIMAL(15, 2) NOT NULL CHECK (totalprice >= 0),
    deliverydays INTEGER NOT NULL CHECK (deliverydays > 0),
    notes TEXT,
    attachmenturl VARCHAR(512),
    status VARCHAR(50) DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Reviewed', 'Accepted', 'Rejected')),
    officerapproved BOOLEAN DEFAULT FALSE,
    vendoraccepted BOOLEAN DEFAULT FALSE,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Item Table
CREATE TABLE IF NOT EXISTS quotationitem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotationid UUID REFERENCES quotation(id) ON DELETE CASCADE,
    itemname VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unitprice DECIMAL(15, 2) NOT NULL CHECK (unitprice >= 0),
    totalprice DECIMAL(15, 2) NOT NULL CHECK (totalprice >= 0)
);

-- Approval Workflow Table
CREATE TABLE IF NOT EXISTS approvalworkflow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL CHECK (type IN ('RFQ', 'PurchaseOrder', 'RFQ_Publish')),
    targetid UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Approval Step Table
CREATE TABLE IF NOT EXISTS approvalstep (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflowid UUID REFERENCES approvalworkflow(id) ON DELETE CASCADE,
    stepnumber INTEGER NOT NULL CHECK (stepnumber > 0),
    approverid UUID REFERENCES "user"(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    remarks TEXT,
    decidedat TIMESTAMP WITH TIME ZONE,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Table
CREATE TABLE IF NOT EXISTS purchaseorder (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ponumber VARCHAR(100) UNIQUE NOT NULL,
    rfqid UUID REFERENCES rfq(id) ON DELETE SET NULL,
    vendorid UUID REFERENCES vendor(id) ON DELETE RESTRICT,
    subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0),
    taxamount DECIMAL(15, 2) NOT NULL CHECK (taxamount >= 0),
    totalamount DECIMAL(15, 2) NOT NULL CHECK (totalamount >= 0),
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Issued', 'Acknowledged', 'Completed', 'Cancelled')),
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletedat TIMESTAMP WITH TIME ZONE
);

-- Purchase Order Item Table
CREATE TABLE IF NOT EXISTS purchaseorderitem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchaseorderid UUID REFERENCES purchaseorder(id) ON DELETE CASCADE,
    itemname VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unitprice DECIMAL(15, 2) NOT NULL CHECK (unitprice >= 0),
    totalprice DECIMAL(15, 2) NOT NULL CHECK (totalprice >= 0)
);

-- Invoice Table
CREATE TABLE IF NOT EXISTS invoice (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoicenumber VARCHAR(100) UNIQUE NOT NULL,
    purchaseorderid UUID REFERENCES purchaseorder(id) ON DELETE RESTRICT,
    subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0),
    taxamount DECIMAL(15, 2) NOT NULL CHECK (taxamount >= 0),
    totalamount DECIMAL(15, 2) NOT NULL CHECK (totalamount >= 0),
    status VARCHAR(50) DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
    duedate TIMESTAMP WITH TIME ZONE NOT NULL,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Item Table
CREATE TABLE IF NOT EXISTS invoiceitem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoiceid UUID REFERENCES invoice(id) ON DELETE CASCADE,
    itemname VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unitprice DECIMAL(15, 2) NOT NULL CHECK (unitprice >= 0),
    taxrate DECIMAL(5, 2) DEFAULT 18.00 CHECK (taxrate >= 0.00),
    taxamount DECIMAL(15, 2) NOT NULL CHECK (taxamount >= 0),
    totalprice DECIMAL(15, 2) NOT NULL CHECK (totalprice >= 0)
);

-- Notification Table
CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userid UUID REFERENCES "user"(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    isread BOOLEAN DEFAULT FALSE,
    createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Extra Indexes for Performance Tuning
CREATE INDEX IF NOT EXISTS idx_vendor_status ON vendor(status);
CREATE INDEX IF NOT EXISTS idx_vendor_categoryid ON vendor(categoryid);
CREATE INDEX IF NOT EXISTS idx_rfq_status ON rfq(status);
CREATE INDEX IF NOT EXISTS idx_quotation_rfqid ON quotation(rfqid);
CREATE INDEX IF NOT EXISTS idx_quotation_vendorid ON quotation(vendorid);
CREATE INDEX IF NOT EXISTS idx_purchaseorder_vendorid ON purchaseorder(vendorid);
CREATE INDEX IF NOT EXISTS idx_invoice_poid ON invoice(purchaseorderid);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON notification(userid) WHERE isread = FALSE;

-- Add vendorid column to user table for linking vendor profiles
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS vendorid UUID REFERENCES vendor(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_vendorid ON "user"(vendorid);

-- Add missing columns to RFQ table
ALTER TABLE rfq ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE rfq ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE rfq ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- Add OTP verification columns to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS resetotp VARCHAR(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS resetotpexpiresat TIMESTAMP WITH TIME ZONE;
