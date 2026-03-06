# RAG Golden-Set Regression Test Report

**Run ID:** b1eaa397-985b-4701-9eb7-de9709949156
**Started:** 2026-02-19T21:49:07.723Z
**Completed:** 2026-02-19T21:56:41.661Z
**Duration:** 454s
**Result:** PASS (target: >=85%)
**Embedding Run:** 07ed97b4-50b2-49d3-bc9e-ade27165aa4f

## Summary

| Metric | Value |
|--------|-------|
| Pass Rate | 90% |
| Passed | 18 |
| Failed | 2 |
| Errored | 0 |
| Avg Response Time | 22s |
| Avg Self-Eval Score | 31% |

## Difficulty Breakdown

| Difficulty | Passed | Total | Rate |
|------------|--------|-------|------|
| easy | 4 | 5 | 80% |
| medium | 8 | 9 | 89% |
| hard | 6 | 6 | 100% |

## Preflight Checks

**Overall:** PASSED

- [PASS] **Document Exists** — Sun-Chip-Bank-Policy-Document-v2.0.md | status=ready
- [PASS] **Knowledge Base Link** — knowledge_base_id: 63739afa...
- [PASS] **Embeddings Exist** — 1000 embeddings (tier1: 1, tier2: 29, tier3: 970) | single run ~2026-02-19T21:40Z | 1 tagged run(s)
- [PASS] **RPC Function (match_rag_embeddings_kb)** — RPC available and callable
- [PASS] **Anthropic API Key** — ANTHROPIC_API_KEY set (sk-ant-...LQAA)
- [PASS] **OpenAI API Key** — OPENAI_API_KEY set (sk-pr...nGkA)

## Individual Results

### Failed (2)

#### GS-002: FAIL [easy]

**Question:** What is the minimum FICO score for conventional loans?
**Expected substring:** `620`
**Self-eval:** 5%
**Response time:** 17s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The provided context does not contain information about minimum FICO score requirements for conventional loans. The document is specifically focused on Sun Chip Private Bank's institutional sovereign banking program for ultra-high-net-worth clients with minimum $10M liquid assets. While the context includes references to FICO score requirements (740 minimum per signer) in relation to the Jumbo Mortgage Program [Section: BC-PROD-004], this applies only to jumbo mortgages exceeding $1.5M for prima
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 20

---

#### GS-012: FAIL [medium]

**Question:** What is the definition of a jumbo mortgage?
**Expected substring:** `conforming`
**Self-eval:** 35%
**Response time:** 20s
**Category:** definition

**Response (first 500 chars):**

```
A jumbo mortgage at Sun Chip Private Bank is defined as [Section: BC-PROD-004] a first-lien mortgage on U.S. residential properties exceeding $1.5M, designed to facilitate the purchase of high-value primary residences for ultra-high-net-worth clients with ultra-strict underwriting.

The program includes specific requirements for borrowers, including [Fact: FICO Score] a minimum FICO credit score of 740 for all jumbo mortgage signers. Additionally, borrowers must maintain [Fact: Jumbo PITI Reserv
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

### Passed (18)

#### GS-001: PASS [easy]

**Question:** What is the DTI limit for jumbo mortgages?
**Expected substring:** `43%`
**Self-eval:** 15%
**Response time:** 26s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The Debt-to-Income (DTI) limit for jumbo mortgages at Sun Chip Private Bank is [Section: BC-PROD-004: Jumbo Mortgage Program] capped at 43% as the standard requirement. However, there is an exception available: [Fact: E1: High Liquidity Offset] clients may have their DTI expanded to 45% if they hold 60 or more months of PITI (Principal, Interest, Taxes, and Insurance) reserves at Sun Chip. This high liquidity offset exception allows qualified borrowers with substantial liquid reserves to exceed 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 23

---

#### GS-003: PASS [easy]

**Question:** What are the wire transfer cutoff times?
**Expected substring:** `cutoff`
**Self-eval:** 85%
**Response time:** 21s
**Category:** direct-lookup

**Response (first 500 chars):**

```
Sun Chip Private Bank establishes specific cutoff times for wire transfer processing. [Section: BC-WIRE-001: Outbound Domestic Wires] The bank defines a "Priority Window" of [Section: BC-WIRE-001: Outbound Domestic Wires] "8:00 AM to 1:00 PM ET for same-day processing." This means that [Section: BC-WIRE-001: Outbound Domestic Wires] "Same-day wires initiated after 1:00 PM ET are processed on the next business day unless an 'Emergency After-Hours Fee' is paid." The Emergency After-Hours Fee for p
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 27

---

#### GS-004: PASS [easy]

**Question:** What is the maximum cash deposit without enhanced due diligence?
**Expected substring:** `10,000`
**Self-eval:** 15%
**Response time:** 22s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The provided context does not contain explicit information about a maximum cash deposit threshold that would trigger enhanced due diligence requirements. While the manual establishes [Section: BC-COMP-002: Source of Funds (SOF) and Source of Wealth (SOW)] that "all inbound transfers >$1M and all initial account funding" require SOF/SOW verification, this represents a compliance trigger rather than a "maximum without enhanced due diligence." Additionally, [Section: BC-ELIG-001: Minimum Balance an
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 40

---

#### GS-005: PASS [easy]

**Question:** What is the FDIC insurance coverage limit?
**Expected substring:** `250,000`
**Self-eval:** 85%
**Response time:** 19s
**Category:** direct-lookup

**Response (first 500 chars):**

```
According to Sun Chip Private Bank's institutional sovereign banking framework, the maximum FDIC insurance coverage limit is [Section: BC-PROD-001] $100,000,000.00 USD via the bank's sweep mechanism. This coverage is achieved through [Section: BC-PROD-001] a network of up to 400 partner banks, with each partner bank holding up to $250,000.00 of the client's cash. The sweep process operates automatically at 4:00 PM ET daily, distributing uninvested cash across this insured network. Additionally, 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 27

---

#### GS-006: PASS [medium]

**Question:** Can the DTI limit be exceeded for jumbo mortgages?
**Expected substring:** `45%`
**Self-eval:** 15%
**Response time:** 21s
**Category:** rule-exception

**Response (first 500 chars):**

```
Yes, the DTI limit can be exceeded for jumbo mortgages under specific circumstances. [Section: BC-PROD-004: Jumbo Mortgage Program] establishes that the standard [Fact: Debt-to-Income (DTI): Ratio of total debt obligations to gross income, capped at 43% for Jumbo Mortgages] applies to these loans. However, there is an exception available: [Fact: E1: High Liquidity Offset: DTI may be expanded to 45% if the client holds 60+ months of PITI reserves at Sun Chip]. This exception allows qualified clie
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

#### GS-007: PASS [medium]

**Question:** Are there any exceptions to the minimum down payment requirement?
**Expected substring:** `exception`
**Self-eval:** 15%
**Response time:** 21s
**Category:** rule-exception

**Response (first 500 chars):**

```
Based on the provided context, there is no documented exception to the minimum down payment requirement of 20 percent for the Jumbo Mortgage Program. [Section: BC-PROD-004: Jumbo Mortgage Program] The policy establishes that [Fact: Minimum Down Payment: 20 percent (per purchase)] as a core requirement.

While the manual does establish an extensive exceptions framework, [Section: 8. Exceptions and Approvals Framework] the specific exceptions detailed for the Jumbo Mortgage Program do not include 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 29

---

#### GS-008: PASS [medium]

**Question:** What happens when a wire transfer is flagged for review?
**Expected substring:** `escalat`
**Self-eval:** 35%
**Response time:** 22s
**Category:** rule-exception

**Response (first 500 chars):**

```
Based on the provided context, when a wire transfer is flagged for review, the specific procedures depend on the type of flag and the circumstances:

**Restricted Industry Transactions:** If a wire is flagged as being directed to a restricted industry, [Section: BC-WIRE-001] states that "Any wire to a 'Restricted Industry' (e.g., Crypto, Cannabis, Offshore Gaming) is automatically blocked and triggers a SAR review." This means the transaction is immediately halted and a Suspicious Activity Repor
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 31

---

#### GS-009: PASS [medium]

**Question:** What are the escalation levels for BSA/AML alerts?
**Expected substring:** `compliance`
**Self-eval:** 35%
**Response time:** 26s
**Category:** rule-exception

**Response (first 500 chars):**

```
The provided context does not contain specific information about escalation levels for BSA/AML (Bank Secrecy Act/Anti-Money Laundering) alerts. While the document establishes a comprehensive escalation matrix in [Section: Appendix D: Escalation Matrix], this matrix addresses escalation procedures for Security Breaches, Margin Calls, SOW Discrepancies, and System Outages, but does not specifically detail BSA/AML alert escalation pathways. The document does reference compliance-related escalations
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 28

---

#### GS-010: PASS [medium]

**Question:** What documents are needed for a jumbo mortgage application?
**Expected substring:** `tax`
**Self-eval:** 35%
**Response time:** 22s
**Category:** rule-exception

**Response (first 500 chars):**

```
Based on Sun Chip Private Bank's institutional standards, jumbo mortgage applications require the following documents:

**Primary Documentation:**
- [Section: BC-PROD-004: Jumbo Mortgage Program] Prior 2 years of Tax Returns
- [Section: BC-PROD-004: Jumbo Mortgage Program] Prior 2 years of W-2s
- [Section: BC-PROD-004: Jumbo Mortgage Program] Prior 60 days of asset seasoning history
- [Section: BC-PROD-004: Jumbo Mortgage Program] Proof of Liquidation for down payment funds

**Collateral and Sec
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 27

---

#### GS-011: PASS [medium]

**Question:** What does DTI stand for in lending context?
**Expected substring:** `debt-to-income`
**Self-eval:** 5%
**Response time:** 18s
**Category:** definition

**Response (first 500 chars):**

```
In the lending context covered by this document, DTI stands for [Fact: Debt-to-Income], which is defined as the "Ratio of total debt obligations to gross income." [Fact: Debt-to-Income (DTI): Ratio of total debt obligations to gross income, capped at 43% for Jumbo Mortgages.] For Sun Chip's Jumbo Mortgage Program, the DTI ratio is capped at a standard maximum of 43%, though this can be expanded to 45% under specific circumstances through the High Liquidity Offset exception if clients hold 60 or 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 3
- Facts retrieved: 23

---

#### GS-013: PASS [medium]

**Question:** What are the fee tiers for different account types?
**Expected substring:** `fee`
**Self-eval:** 15%
**Response time:** 17s
**Category:** table-data

**Response (first 500 chars):**

```
Based on the provided context, Sun Chip Private Bank's documentation specifies one primary fee structure related to account tiers. [Section: BC-ELIG-001: Minimum Balance and Maintenance Rules] The bank charges a "Sub-Tier Maintenance Fee" of $5,000.00 USD per month to accounts that have been downgraded due to falling below the $10M minimum balance requirement. This fee applies specifically to accounts that fail to restore their Daily Average Balance (DAB) to $10M+ within the 30-day Cure Window.

```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 24

---

#### GS-014: PASS [medium]

**Question:** What interest rates apply to certificates of deposit?
**Expected substring:** `rate`
**Self-eval:** 15%
**Response time:** 14s
**Category:** table-data

**Response (first 500 chars):**

```
The provided context does not contain information about certificates of deposit (CDs) or their interest rates at Sun Chip Private Bank. The document focuses on other products including [Section: BC-PROD-001: Flagship Cash Account and Sweep Logic], [Section: BC-PROD-002: Treasury Ladder Automation], and [Section: BC-PROD-004: Jumbo Mortgage Program], but does not address CD products or CD interest rate structures. To obtain information about Sun Chip's CD offerings and rates, you would need to co
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 20

---

#### GS-015: PASS [hard]

**Question:** What documents do I need to open an account?
**Expected substring:** `identification`
**Self-eval:** 35%
**Response time:** 24s
**Category:** cross-section

**Response (first 500 chars):**

```
To open an account at Sun Chip Private Bank, you must provide several categories of documents depending on your account type.

**Primary Identity Documents:**
You must submit [Section: BC-ELIG-002: U.S.-Only Residency and Re-verification] "a valid U.S. Passport" as your primary identification document. Additionally, you are required to provide [Section: BC-ELIG-002: U.S.-Only Residency and Re-verification] "a current utility bill (E-statements are NOT acceptable)" dated within the last 30 days a
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 31

---

#### GS-016: PASS [hard]

**Question:** Compare the lending requirements for conventional vs jumbo mortgages
**Expected substring:** `jumbo`
**Self-eval:** 15%
**Response time:** 26s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided context, I can only offer limited information about Sun Chip's jumbo mortgage program, as the knowledge base does not contain details about conventional mortgage requirements for comparison.

For [Section: BC-PROD-004: Jumbo Mortgage Program], Sun Chip defines jumbo mortgages as [Section: BC-PROD-004] "first-lien mortgages on U.S. residential properties exceeding $1.5M." The program establishes several specific requirements:

**Minimum Property Value:** [Section: BC-PROD-00
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 27

---

#### GS-017: PASS [hard]

**Question:** What audit requirements apply to wire transfers over $50,000?
**Expected substring:** `audit`
**Self-eval:** 72%
**Response time:** 25s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the Sun Chip Private Bank Institutional Sovereign Manual, wire transfers over $50,000 are subject to specific audit and documentation requirements. [Section: BC-WIRE-001: Outbound Domestic Wires]

All outbound domestic wire transfers must generate audit receipt documentation with the following fields: wire_imad_omad, beneficiary_name_match_score, cooling_off_expiry_utc, bccc_reference_id, and recipient_whitelist_tenure_days. [Section: BC-WIRE-001: Outbound Domestic Wires]

For wires exc
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 35

---

#### GS-018: PASS [hard]

**Question:** What are all the circumstances that require manager approval?
**Expected substring:** `approv`
**Self-eval:** 35%
**Response time:** 27s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the Sun Chip Private Bank Institutional Sovereign Manual, manager approval is required in several specific circumstances:

1. **Downgrade Reversal**: [Section: BC-ELIG-001] requires "Senior Wealth Lead approval" to reverse an automatic downgrade when an account falls below the $10M minimum balance threshold.

2. **ACH Limit Increases**: [Section: Appendix D - Escalation Matrix] indicates that the Operations Manager approves ACH limit increases, as referenced in the escalation path for l
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 27

---

#### GS-019: PASS [hard]

**Question:** How do the compliance requirements differ between domestic and international wire transfers?
**Expected substring:** `international`
**Self-eval:** 35%
**Response time:** 27s
**Category:** cross-section

**Response (first 500 chars):**

```
Sun Chip Private Bank maintains significantly stricter compliance requirements for international wire transfers compared to domestic transfers, effectively creating a near-prohibition on international movement of funds.

For [Section: BC-WIRE-001: Outbound Domestic Wires], domestic Fedwire transfers are subject to structured controls including cooling-off periods and whitelisting requirements. Wires exceeding $2,000,000 require a BCCC and a 4-hour cooling-off period unless the recipient is Tier-
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 31

---

#### GS-020: PASS [hard]

**Question:** What are the complete steps for processing a mortgage application from start to finish?
**Expected substring:** `appraisal`
**Self-eval:** 15%
**Response time:** 24s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided context, I can only offer partial information about Sun Chip's jumbo mortgage application process, as the document does not contain a complete step-by-step workflow from initial application through closing.

What is documented:

**Program Scope:** [Section: BC-PROD-004] The jumbo mortgage program provides "first-lien mortgages on U.S. residential properties exceeding $1.5M" and is designed to "facilitate the purchase of high-value primary residences for Sun Chip clients wit
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 23

---
