# **Moon Banc: The Helvetica Private Client Manual (v4.5)**

**Effective Date:** March 15, 2026

**Version:** 4.5 (General Revision for FINMA Alignment)

**Classification:** **Confidential** – Strictly for Internal Use and Accredited Clients

**Policy Ownership:** Directorate of Integrity & Swiss Compliance (DISC)

## **\---**

**Change Log**

| Version | Date | Description of Change | Author |
| :---- | :---- | :---- | :---- |
| v4.5 | 03/15/2026 | Alignment with new Swiss Federal Act on Data Protection (FADP) and integration of Digital Asset Vaulting protocols. | DISC Secretariat |

## **\---**

**1\. Bank Overview and Philosophy**

### **1.1 The Moon Banc Mandate**

Moon Banc operates under the laws of the Swiss Confederation to provide "Neutrality, Privacy, and Continuity" for ultra-high-net-worth individuals and sovereignty-grade entities with a minimum relationship balance of **25,000,000.00 CHF** (Swiss Francs). Unlike volume-based institutions, Moon Banc functions as a boutique depository, prioritizing the physical preservation of purchasing power over yield chasing. We leverage Switzerland's geopolitical neutrality and the "Deep Cold Storage" philosophy to protect wealth from inflationary erosion and digital seizure.

### **1.2 The "Air-Gap" Philosophy**

Moon Banc rejects the "always-on" connectivity of modern retail banking. Our security architecture is predicated on the "Air-Gap Doctrine." Critical wealth reserves are kept offline by default. Transactions are not instantaneous conveniences but deliberate, authorized events. We utilize the "Two-Man Rule" for all significant system changes, ensuring that no single compromised credential can authorize the outflow of capital.

### **1.3 Controlled Vocabulary and System States**

To facilitate precise communication within our encrypted client portal (The Lunar Link), the following glossary is mandatory.

#### **1.3.1 Glossary of Terms**

| Term | Definition |
| :---- | :---- |
| **Alpine Vault** | The physical, sub-terrestrial storage facility in Zug used for bullion and cold-wallet key storage. |
| **Cantonal Override** | A manual exception process requiring wet-ink signatures from two Managing Partners. |
| **Deep Freeze** | A 72-hour hold placed on all new beneficiary IBANs outside of the SEPA zone. |
| **Helix Protocol** | The multi-stage cryptographic handshake required to authorize transfers exceeding 5M CHF. |
| **Low-Orbit Mode** | A restricted account state triggered when AUM falls below the 25M CHF threshold. |
| **Lombard Tier** | The risk rating assigned to collateralized assets (Tier I: G10 Currencies/Gold; Tier III: Equities). |
| **The Slate** | The proprietary biometric tablet issued to clients for physical transaction signing (vein-pattern recognition). |
| **Shadow Limit** | A hidden daily transaction limit known only to the bank, dynamically adjusted based on client location. |
| **Silent Alarm** | A specific PIN code entered into The Slate that grants access but alerts the Security Operations Center (SOC) of duress. |
| **SIC / SEPA** | Swiss Interbank Clearing and Single Euro Payments Area systems. |
| **Zurich Time (CET/CEST)** | The official reference time for all cut-offs and value dates. |

## **\---**

**2\. Eligibility and Account Standards**

### **MB-ELIG-001: Minimum Asset and Jurisdiction Standards**

**1\. Purpose**

To maintain the exclusivity and operational efficiency of the bank's boutique service model.

**2\. Scope**

Applies to all Global Family Office (GFO) and Private Investment Company (PIC) accounts.

**3\. Definitions**

* **Net Asset Value (NAV):** The combined value of cash, securities, and physically vaulted metals.  
* **Qualified Jurisdiction:** Any country not listed on the FATF Grey/Black list or Moon Banc's internal "Sanctioned Zone."

**4\. Policy Rules**

* R1: New clients must deposit a minimum of **25,000,000.00 CHF** (or equivalent in USD/EUR/GBP) within 90 days of onboarding.  
* R2: Unlike US-centric models, Moon Banc accepts multi-jurisdictional clients, provided they are tax-compliant in their domicile (CRS/FATCA adherence required).  
* R3: If NAV falls below 25M CHF, the account enters "Low-Orbit Mode" immediately.  
* R4: Low-Orbit accounts are assessed a "Complexity Fee" of **15,000.00 CHF per quarter**.  
* R5: Accounts remaining in Low-Orbit Mode for 12 months will be administratively offboarded via check to the last known address.  
* R6: Clients must maintain a physical correspondence address; P.O. Boxes are strictly prohibited.

**5\. Limits & Thresholds**

* Minimum Entry Balance: 25,000,000.00 CHF.  
* Onboarding Grace Period: 90 Days.  
* Complexity Fee: 15,000.00 CHF/Quarter.  
* Allowed Currencies: CHF, USD, EUR, GBP, JPY, SGD.

**6\. Required Documents**

* **Certified Copy of Passport:** Apostilled within the last 6 months.  
* **Utility Bill:** Not older than 3 months.  
* **Tax Ruling:** For lump-sum taxation clients (if applicable in Switzerland).

**7\. Exceptions**

* E1: "NextGen Provision": Children of primary clients may open accounts with 5M CHF, provided the family aggregate exceeds 100M CHF.

## **\---**

**3\. Identity, Access, and Security**

### **MB-SEC-001: The Slate and Biometric Vein Authentication**

**1\. Purpose**

To replace easily compromised passwords and consumer-grade 2FA with military-grade hardware authentication.

**2\. Scope**

All transaction authorizations and sensitive data access.

**3\. Definitions**

* **The Slate:** A dedicated, cellular-enabled hardware device with no browser, used solely for signing transactions.  
* **Palm Vein Scan:** An infrared scan of the user's hand vascular pattern, which is unique and impossible to replicate with latex or digital spoofs.

**4\. Policy Rules**

* R1: Access to the web portal requires "Two-Tier Auth": Username/Password \+ Push Notification to The Slate.  
* R2: Money movement requires "Three-Tier Auth": The above \+ a live Palm Vein Scan on The Slate.  
* R3: The Slate communicates via a dedicated, encrypted cellular APN (private network), not public Wi-Fi.  
* R4: If The Slate is damaged or lost, a "Paper Protocol" (Code Card) can be used for "View Only" access; transfers are disabled until replacement.  
* R5: Entering the "Silent Alarm" PIN (e.g., reversing the last two digits) unlocks the device but triggers a silent police dispatch to the device's GPS location.

**5\. Limits & Thresholds**

* Slate Battery Life: Must be charged once every 30 days to maintain key integrity.  
* Replacement Fee: 2,500.00 CHF (includes courier).  
* Failed Biometric Attempts: 5 attempts result in device bricking.

**6\. Required Documents**

* **Biometric Consent Form:** Compliant with FADP.

**7\. Exceptions**

* E1: "Proxy Signer": A registered attorney may sign via their own Slate if Power of Attorney is registered in the Swiss Commercial Registry.

### **\---**

**MB-SEC-002: The Helix Protocol (High-Value Authorization)**

**1\. Purpose**

To secure transactions that threaten the solvency of the account or represent abnormal patterns.

**2\. Scope**

All outbound transfers exceeding **5,000,000.00 CHF** or currency conversions \> 10M CHF.

**3\. Definitions**

* **Quorum Approval:** The requirement for approval from the Client \+ Relationship Manager \+ Compliance Officer.

**4\. Policy Rules**

* R1: Triggering the Helix Protocol pauses the transaction in a "Pre-Clearing State."  
* R2: The Relationship Manager (RM) verbally contacts the client via a pre-agreed "Safe Line" (Signal/Threema).  
* R3: The client must provide a "Knowledge Factor" (answer to a dynamic security question based on physical files held in Zurich).  
* R4: Final release requires the "Digital Key" from the RM and the "Compliance Key" from the DISC officer.

**5\. Limits & Thresholds**

* Helix Threshold: 5,000,000.00 CHF.  
* Execution SLA: T+1 (Next Business Day).

## **\---**

**4\. Money Movement**

### **MB-TRANS-001: International Wire Transfers (SWIFT/SEPA)**

**1\. Purpose**

To facilitate global capital flows while adhering to strict AML/KYC/Sanctions filtering.

**2\. Scope**

All MT103 (SWIFT) and pacs.008 (SEPA) messages.

**3\. Definitions**

* **Value Date:** The date funds are actually credited to the beneficiary.  
* **Correspondent Bank:** The intermediary institution clearing USD (New York) or EUR (Frankfurt).

**4\. Policy Rules**

* R1: **Deep Freeze:** Any wire to a new beneficiary IBAN is held for **72 hours** to allow for fraud recall.  
* R2: Transfers to "High-Risk Jurisdictions" (as defined by SECO) require an underlying invoice or contract upload.  
* R3: Wires \< 10,000.00 CHF are subject to a "Small Ticket Surcharge" to discourage retail-like usage.  
* R4: Outbound Cut-off time is **11:00 AM CET**. Requests after this time are processed T+1.  
* R5: All USD transfers clear through our NY correspondent and are subject to US OFAC screening.

**5\. Limits & Thresholds**

* Standard SWIFT Fee: 450.00 CHF.  
* Small Ticket Surcharge: 150.00 CHF (for transfers \< 10k).  
* Deep Freeze Duration: 72 Hours.  
* Max Daily Limit: 50,000,000.00 CHF (without Board Approval).

**6\. Required Documents**

* **Source of Wealth Statement:** For all inflows \> 1M CHF.  
* **Commercial Invoice:** For payments to corporate entities in Asia/LatAm.

**7\. Exceptions**

* E1: "Intra-Bank Transfer": Instant settlement for transfers between two Moon Banc entities (e.g., Moon Banc Zurich to Moon Banc Singapore).

### **\---**

**MB-TRANS-002: Physical Cash and Precious Metals**

**1\. Purpose**

To manage physical liquidity and bullion stored within the Alpine Vault system.

**2\. Scope**

Withdrawals of CHF banknotes and physical allocation of Gold (XAU).

**3\. Definitions**

* **Good Delivery Bar:** Standard 400oz gold bar or 1kg kilobar, 99.99% pure.  
* **Allocated Storage:** Specific bars identified by serial number belong to the client (not the bank's balance sheet).

**4\. Policy Rules**

* R1: Cash withdrawals exceeding 100,000.00 CHF require 3 business days' notice for armored transport arrangement.  
* R2: Moon Banc does not maintain "Over-the-Counter" cash services. All cash is delivered via secure logistics partners (e.g., Loomis/Brinks).  
* R3: Clients may convert cash balances to Allocated Gold instantly. Storage fees apply (0.40% per annum).  
* R4: Physical redemption of gold requires the client to be present at the Freeport Gate in Geneva or Zurich.

**5\. Limits & Thresholds**

* Cash Logistics Fee: 1.5% of face value \+ Transport Costs.  
* Gold Storage Fee: 0.40% p.a. (billed quarterly).  
* Min Gold Purchase: 1 kg Bar.

## **\---**

**5\. Compliance and Risk**

### **MB-COMP-001: Global Tax Compliance (CRS/FATCA)**

**1\. Purpose**

To ensure Moon Banc is never used as a vehicle for tax evasion, adhering to the Automatic Exchange of Information (AEOI).

**2\. Scope**

All accounts.

**3\. Policy Rules**

* R1: Every client must have a validated **Tax Identification Number (TIN)** for their country of residence.  
* R2: "US Persons" (Citizens/Green Card holders) must sign a W-9 Waiver allowing direct reporting to the IRS.  
* R3: "Hold Mail" services are prohibited if used to obscure tax residency.  
* R4: The bank automatically generates an annual tax report suitable for filing in the UK (Non-Dom), France, Germany, and Italy.

### **MB-COMP-002: Prohibited and Restricted Activities**

**1\. Purpose**

To avoid reputational contagion.

**2\. Prohibited Lists**

* **Dark Privacy Coins:** Monero (XMR), Zcash (ZEC).  
* **Conflict Resources:** Diamonds or minerals without Kimberley Process certification.  
* **Unregulated Gambling:** Transfers to offshore casinos not licensed in the EU/UK/CH.  
* **Parallel Banking:** Hawala networks.

**3\. Restricted (Requires Approval)**

* **Crypto-Asset Firms:** Exchanges or custodians (Must be regulated by FINMA or equivalent).  
* **Arms Trade:** Only sovereign-to-sovereign contracts permitted with SECO permits.

## **\---**

**6\. Products and Credit**

### **MB-PROD-001: Multi-Currency Lombard Lending**

**1\. Purpose**

To provide liquidity against a diversified global portfolio without triggering capital gains events.

**2\. Scope**

Credit lines secured by liquid assets held at Moon Banc.

**3\. Definitions**

* **LTV (Loan-to-Value):** The percentage of the asset value available as a loan.  
* **Margin Call Level:** The threshold where assets are sold to cover the loan.

**4\. Policy Rules**

* R1: Credit is available in CHF, USD, EUR, or JPY.  
* R2: **Cross-Collateralization:** Assets in different currencies can collateralize a single loan.  
* R3: **LTV Ratios:**  
  * Cash/Money Market Funds: 90%  
  * Sovereign Bonds (AAA): 85%  
  * Global Equities (Blue Chip): 60%  
  * Allocated Gold: 70%  
  * Cryptocurrencies (BTC/ETH Only): 30% (Requires "Cold Storage Pledge")  
* R4: Margin Call occurs if LTV usage reaches 105% of the limit. The client has **4 hours** to cure.  
* R5: Interest rates are based on SARON (CHF) or SOFR (USD) \+ Client Spread (1.50% \- 2.50%).

**5\. Limits & Thresholds**

* Min Credit Line: 2,000,000.00 CHF.  
* Max Equity LTV: 60%.  
* Crypto LTV: 30%.  
* Liquidation Buffer: 4 Hours.

**6\. Required Documents**

* **Deed of Pledge:** Establishing the bank's right to set-off.

### **MB-PROD-002: The Alpine Vault (Digital Asset Custody)**

**1\. Purpose**

To offer institutional-grade custody for Bitcoin and Ethereum, fully integrated into the client's Net Asset Value.

**2\. Scope**

Segregated Wallets generated via HSM (Hardware Security Modules) in Swiss bunkers.

**3\. Policy Rules**

* R1: Private keys are never connected to the internet ("Cold Storage").  
* R2: Withdrawal of crypto-assets requires the "Helix Protocol" (See MB-SEC-002) plus a video verification call.  
* R3: Moon Banc does not support DeFi staking or "Yield Farming" due to smart contract risk.  
* R4: "Travel Rule" compliance is mandatory for all crypto transfers \> 1,000 CHF.

## **\---**

**7\. Family Office & Lifestyle Governance**

### **Cyber-Physical Executive Protection**

Unlike traditional banking, Moon Banc advises GFOs on physical security to complement financial safety.

**1\. Kidnap & Ransom (K\&R) Policies**

* Clients with a public profile \> Tier 1 are recommended to hold K\&R insurance.  
* Moon Banc facilitates premium payments to Lloyd's of London syndicates via anonymized trusts to preventing flagging the client as a high-value target.

**2\. Secure Communications**

* Moon Banc provides "Burner Protocols" for clients traveling to high-surveillance zones (e.g., certain Asian or Middle Eastern nations).  
* Clients are issued "Clean Laptops" (Chromebooks with no local storage) for banking access while abroad.

### **Freeport Art Logistics**

**1\. Bonded Warehousing**

* Art held in the Geneva Freeport is considered "in transit" for tax purposes.  
* Moon Banc accepts Freeport Warehouse Receipts as collateral (LTV 40%).  
* Annual "Proof of Existence" audits are conducted by third-party appraisers.

## **\---**

**8\. Exceptions and Governance**

### **MB-EXCP-001: The Cantonal Override**

**1\. Purpose**

To handle "Force Majeure" events where standard policies would cause undue harm.

**2\. Policy Rules**

* R1: Standard exceptions are approved by the Head of Private Banking.  
* R2: **Cantonal Override:** Any exception involving \> 20M CHF or a deviation from AML policy requires the physical "Wet Ink" signature of two Managing Partners.  
* R3: All exceptions are reported quarterly to the Board of Directors.

## **\---**

**Appendix A: Fee Schedule (Standard)**

| Service | Fee | Frequency |
| :---- | :---- | :---- |
| Account Maintenance (\< 25M CHF) | 15,000 CHF | Quarterly |
| Account Maintenance (\> 25M CHF) | 0.00 CHF | Waived |
| SWIFT Transfer (Out) | 450 CHF | Per Tx |
| Gold Storage | 0.40% | Annually |
| Crypto Custody | 0.65% | Annually |
| Slate Replacement | 2,500 CHF | Per Event |
| Account Closing (Admin) | 5,000 CHF | One-time |

**Appendix B: Contact & Escalation**

* **24/7 Service Desk:** \+41 44 555 01 99 (Verified Client ID Required)  
* **Security Operations (Loss of Slate):** \+41 44 555 99 00  
* **Ombudsman:** Swiss Banking Ombudsman, Zurich.