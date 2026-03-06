# RAG Golden-Set Regression Test Report

**Run ID:** 8443f2e9-0afe-4d1a-b13d-fec7a9367c58
**Started:** 2026-02-20T00:27:38.743Z
**Completed:** 2026-02-20T00:35:09.664Z
**Duration:** 451s
**Result:** FAIL (target: >=85%)
**Embedding Run:** 124c44c5-6f85-46d6-a1fd-2f94bc49ac18

## Summary

| Metric | Value |
|--------|-------|
| Pass Rate | 80% |
| Passed | 16 |
| Failed | 4 |
| Errored | 0 |
| Avg Response Time | 22s |
| Avg Self-Eval Score | 41% |

## Difficulty Breakdown

| Difficulty | Passed | Total | Rate |
|------------|--------|-------|------|
| easy | 3 | 5 | 60% |
| medium | 8 | 9 | 89% |
| hard | 5 | 6 | 83% |

## Preflight Checks

**Overall:** PASSED

- [PASS] **Document Exists** — Sun-Chip-Bank-Policy-Document-v2.0.md | status=ready
- [PASS] **Knowledge Base Link** — knowledge_base_id: 4856bfb9...
- [PASS] **Embeddings Exist** — 1000 embeddings (tier1: 1, tier2: 29, tier3: 970) | single run ~2026-02-19T23:59Z | 1 tagged run(s)
- [PASS] **RPC Function (match_rag_embeddings_kb)** — RPC available and callable
- [PASS] **Anthropic API Key** — ANTHROPIC_API_KEY set (sk-ant-...LQAA)
- [PASS] **OpenAI API Key** — OPENAI_API_KEY set (sk-pr...nGkA)

## Individual Results

### Failed (4)

#### GS-002: FAIL [easy]

**Question:** What is the minimum FICO score for conventional loans?
**Expected substring:** `620`
**Self-eval:** 15%
**Response time:** 17s
**Category:** direct-lookup

**Response (first 500 chars):**

```
Based on the provided context, the minimum FICO score requirement is 740 for all signers in Sun Chip Private Bank's jumbo mortgage program. [Section: BC-PROD-004: Jumbo Mortgage Program] Specifically, the policy states that 'Minimum FICO score of 740 is required for all signers.' [Section: BC-PROD-004: Jumbo Mortgage Program]

However, it is important to note that this requirement applies specifically to Sun Chip's jumbo mortgage program for properties exceeding $1.5M, not to conventional loans 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 21

---

#### GS-004: FAIL [easy]

**Question:** What is the maximum cash deposit without enhanced due diligence?
**Expected substring:** `10,000`
**Self-eval:** 15%
**Response time:** 24s
**Category:** direct-lookup

**Response (first 500 chars):**

```
Based on the Sun Chip Private Bank Institutional Sovereign Manual, there is no maximum cash deposit threshold that avoids enhanced due diligence. Instead, the manual establishes a **$1,000,000 trigger for Source of Funds (SOF) verification** [Section: BC-COMP-002]. Specifically, [Fact: SOF Trigger: Any single inbound transaction >$1,000,000.00 USD] requires enhanced scrutiny.

Moreover, **all initial account deposits must be accompanied by enhanced documentation regardless of amount**. [Section:
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 33

---

#### GS-012: FAIL [medium]

**Question:** What is the definition of a jumbo mortgage?
**Expected substring:** `conforming`
**Self-eval:** 92%
**Response time:** 21s
**Category:** definition

**Response (first 500 chars):**

```
According to Sun Chip Private Bank's Institutional Sovereign Manual, a jumbo mortgage is defined as [Section: BC-PROD-004: Jumbo Mortgage Program] "first-lien mortgages on U.S. residential properties exceeding $1.5M." The program is designed [Section: BC-PROD-004: Jumbo Mortgage Program] "to facilitate the purchase of high-value primary residences for Sun Chip clients with ultra-strict underwriting." These mortgages are subject to rigorous qualification standards, including [Section: BC-PROD-004
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

#### GS-015: FAIL [hard]

**Question:** What documents do I need to open an account?
**Expected substring:** `identification`
**Self-eval:** 78%
**Response time:** 24s
**Category:** cross-section

**Response (first 500 chars):**

```
To open an account at Sun Chip Private Bank, you will need to provide several categories of documents during the onboarding phase.

For individual identity verification, [Section: BC-ELIG-002: U.S.-Only Residency and Re-verification] requires "a valid U.S. Passport or State-issued ID" along with proof of U.S. residency. Additionally, [Section: BC-ELIG-002] specifies that "Annual re-verification is required every January via submission of a primary utility bill (water, power, or gas) dated within
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 24

---

### Passed (16)

#### GS-001: PASS [easy]

**Question:** What is the DTI limit for jumbo mortgages?
**Expected substring:** `43%`
**Self-eval:** 35%
**Response time:** 20s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The standard Debt-to-Income (DTI) ratio limit for jumbo mortgages at Sun Chip Private Bank is capped at 43% [Section: BC-PROD-004: Jumbo Mortgage Program]. However, there is an exception available: the DTI may be expanded to 45% if the client holds 60 or more months of PITI reserves at Sun Chip [Section: BC-PROD-004: Jumbo Mortgage Program]. This High Liquidity Offset exception allows qualifying clients with substantial liquid reserves to exceed the standard DTI threshold.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

#### GS-003: PASS [easy]

**Question:** What are the wire transfer cutoff times?
**Expected substring:** `cutoff`
**Self-eval:** 85%
**Response time:** 22s
**Category:** direct-lookup

**Response (first 500 chars):**

```
Sun Chip Private Bank establishes specific cutoff times for wire transfer processing based on when the transfer is initiated. [Section: BC-WIRE-001: Outbound Domestic Wires]

The bank defines a "Priority Window" of [Section: BC-WIRE-001: Outbound Domestic Wires] "8:00 AM to 1:00 PM ET for same-day processing." Wires initiated within this window during business hours are processed the same day. [Section: BC-WIRE-001: Outbound Domestic Wires]

However, [Section: BC-WIRE-001: Outbound Domestic Wire
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 26

---

#### GS-005: PASS [easy]

**Question:** What is the FDIC insurance coverage limit?
**Expected substring:** `250,000`
**Self-eval:** 92%
**Response time:** 19s
**Category:** direct-lookup

**Response (first 500 chars):**

```
According to Sun Chip Private Bank's institutional sovereign manual, the maximum FDIC insurance coverage limit is [Section: BC-PROD-001] $100,000,000.00 USD, achieved through the bank's automated sweep program. This coverage is provided via the "Insured Network," which distributes client funds across up to 400 partner banks, with each partner bank holding up to $250,000.00 of the client's cash to remain within standard FDIC insurance limits.

Clients have the flexibility to [Section: BC-PROD-001
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

#### GS-006: PASS [medium]

**Question:** Can the DTI limit be exceeded for jumbo mortgages?
**Expected substring:** `45%`
**Self-eval:** 35%
**Response time:** 22s
**Category:** rule-exception

**Response (first 500 chars):**

```
Yes, the DTI limit for jumbo mortgages can be exceeded under specific circumstances. [Section: BC-PROD-004: Jumbo Mortgage Program] The standard DTI ratio is capped at 43%, as stated in policy rule R4: "Debt-to-Income (DTI) ratio is capped at 43%." However, there is an exception that allows this limit to be expanded. [Section: BC-PROD-004: Jumbo Mortgage Program] Exception E1, titled "High Liquidity Offset," permits DTI to be expanded to 45% if the client holds 60+ months of PITI reserves at Sun
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

#### GS-007: PASS [medium]

**Question:** Are there any exceptions to the minimum down payment requirement?
**Expected substring:** `exception`
**Self-eval:** 25%
**Response time:** 20s
**Category:** rule-exception

**Response (first 500 chars):**

```
The provided context does not contain information about a minimum down payment requirement or any exceptions to such a requirement. While the document covers various financial products and requirements—including [Section: BC-PROD-004: Jumbo Mortgage Program] for mortgages exceeding $1.5M and [Section: BC-PROD-003: Securities-Backed Line of Credit (SBLOC)] for securities-backed lending—neither section explicitly defines a minimum down payment requirement or associated exceptions. The document doe
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 25

---

#### GS-008: PASS [medium]

**Question:** What happens when a wire transfer is flagged for review?
**Expected substring:** `escalat`
**Self-eval:** 25%
**Response time:** 23s
**Category:** rule-exception

**Response (first 500 chars):**

```
The provided context does not contain specific information about what happens when a wire transfer is flagged for review. While the manual establishes comprehensive wire transfer procedures and security controls, it does not explicitly detail the review process, investigation procedures, or outcomes when a wire is flagged.

The context does indicate that [Section: BC-WIRE-001] establishes "rigid controls over the most common high-value exit vector for funds, ensuring that Fedwire transfers are a
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 29

---

#### GS-009: PASS [medium]

**Question:** What are the escalation levels for BSA/AML alerts?
**Expected substring:** `compliance`
**Self-eval:** 35%
**Response time:** 23s
**Category:** rule-exception

**Response (first 500 chars):**

```
The provided context does not contain specific information about escalation levels for BSA/AML (Bank Secrecy Act/Anti-Money Laundering) alerts. While the document establishes a comprehensive escalation matrix and exception handling framework, the available sections focus on other compliance areas such as Source of Wealth (SOW) verification, prohibited industries, and transaction-specific escalations. The [Section: Appendix D: Escalation Matrix] provides a structured decision tree for routing exc
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 28

---

#### GS-010: PASS [medium]

**Question:** What documents are needed for a jumbo mortgage application?
**Expected substring:** `tax`
**Self-eval:** 85%
**Response time:** 22s
**Category:** rule-exception

**Response (first 500 chars):**

```
Based on Sun Chip Private Bank's institutional standards, jumbo mortgage applications require the following documents:

**Primary Documents:**
- [Section: BC-PROD-004: Jumbo Mortgage Program] Prior 2 years of Federal Tax Returns
- [Section: BC-PROD-004: Jumbo Mortgage Program] Prior 2 years of W-2s
- [Section: BC-PROD-004: Jumbo Mortgage Program] Proof of asset seasoning for a minimum of 60 days prior to application
- [Section: BC-PROD-004: Jumbo Mortgage Program] Proof of liquidation documentat
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 26

---

#### GS-011: PASS [medium]

**Question:** What does DTI stand for in lending context?
**Expected substring:** `debt-to-income`
**Self-eval:** 15%
**Response time:** 19s
**Category:** definition

**Response (first 500 chars):**

```
In the lending context, DTI stands for [Fact: Debt-to-Income Ratio]. It is defined as the ratio of monthly debt obligations to gross monthly income. At Sun Chip Private Bank, the DTI ratio is a key underwriting metric for the Jumbo Mortgage Program, where [Section: BC-PROD-004] it is capped at a maximum of 43%. However, there is an exception available: under the "High Liquidity Offset" provision [Section: BC-PROD-004], the DTI may be expanded to 45% if the client holds 60 or more months of PITI 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 27

---

#### GS-013: PASS [medium]

**Question:** What are the fee tiers for different account types?
**Expected substring:** `fee`
**Self-eval:** 15%
**Response time:** 19s
**Category:** table-data

**Response (first 500 chars):**

```
Based on the Sun Chip Private Bank Institutional Sovereign Manual, the document provides limited information about fee tiers for different account types. The primary fee structure mentioned is for downgraded accounts: [Section: BC-ELIG-001: Minimum Balance and Maintenance Rules] accounts that fall below the $10M minimum and are downgraded lose access to BCCC-privileged Service Circuits and are subject to a "$5,000.00 monthly 'Sub-Tier Maintenance Fee.'" This fee applies specifically to accounts 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 22

---

#### GS-014: PASS [medium]

**Question:** What interest rates apply to certificates of deposit?
**Expected substring:** `rate`
**Self-eval:** 15%
**Response time:** 14s
**Category:** table-data

**Response (first 500 chars):**

```
The provided context does not contain information about certificates of deposit (CDs) or their interest rates at Sun Chip Private Bank. The document covers several product offerings including [Section: BC-PROD-001: Flagship Cash Account and Sweep Logic], [Section: BC-PROD-002: Treasury Ladder Automation], [Section: BC-PROD-003: Securities-Backed Line of Credit (SBLOC)], and [Section: BC-PROD-004: Jumbo Mortgage Program], but certificates of deposit are not mentioned in any of these sections. To 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 20

---

#### GS-016: PASS [hard]

**Question:** Compare the lending requirements for conventional vs jumbo mortgages
**Expected substring:** `jumbo`
**Self-eval:** 35%
**Response time:** 24s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided knowledge base, I can only offer information about Sun Chip Private Bank's jumbo mortgage program, as the context does not contain details about conventional mortgage requirements for comparison.

For Sun Chip's jumbo mortgages, the following requirements are specified: [Section: BC-PROD-004] Jumbo mortgages apply to "first-lien mortgages on U.S. residential properties exceeding $1.5M." The program requires [Fact: Minimum Down Payment] a minimum down payment of 20% of the p
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 27

---

#### GS-017: PASS [hard]

**Question:** What audit requirements apply to wire transfers over $50,000?
**Expected substring:** `audit`
**Self-eval:** 35%
**Response time:** 26s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the Sun Chip Private Bank Institutional Sovereign Manual, wire transfers over $50,000 are subject to specific audit and documentation requirements, though the manual does not establish a distinct audit threshold at the $50,000 level itself.

For wires exceeding $5,000,000, [Section: BC-WIRE-001] requires [Fact: Wires >$5M: Notarized "Funds Release Authorization" (If BCCC is unavailable)]. Additionally, all outbound domestic wires must include [Section: BC-WIRE-001] audit receipt fields 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 32

---

#### GS-018: PASS [hard]

**Question:** What are all the circumstances that require manager approval?
**Expected substring:** `approv`
**Self-eval:** 35%
**Response time:** 25s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the Sun Chip Private Bank Institutional Sovereign Manual, manager approval is required in the following circumstances:

1. **ACH Limit Increases**: [Section: BC-ACH-001] The Operations Manager must approve any increases to the daily outbound ACH limit, which is standardized at $100,000.00 USD.

2. **Emergency Wire Requests Outside Priority Window**: [Fact: Head of Operations] The Head of Operations serves as the approver for emergency wire requests that fall outside the standard 8:00 AM
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 36

---

#### GS-019: PASS [hard]

**Question:** How do the compliance requirements differ between domestic and international wire transfers?
**Expected substring:** `international`
**Self-eval:** 35%
**Response time:** 26s
**Category:** cross-section

**Response (first 500 chars):**

```
Sun Chip Private Bank maintains significantly stricter requirements for international wire transfers compared to domestic wires, reflecting its U.S.-only operational philosophy.

For **domestic wire transfers**, the bank enforces standard cooling-off periods and authentication requirements. [Section: BC-WIRE-001] Wires exceeding $2,000,000 require a BCCC and a 4-hour cooling-off period unless the recipient is Tier-1 Whitelisted for 180+ days. Same-day wires initiated after 1:00 PM ET are process
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 31

---

#### GS-020: PASS [hard]

**Question:** What are the complete steps for processing a mortgage application from start to finish?
**Expected substring:** `appraisal`
**Self-eval:** 25%
**Response time:** 24s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided context, Sun Chip Private Bank offers a Jumbo Mortgage Program for ultra-high-net-worth clients, but the document does not contain a complete step-by-step processing workflow from application start to finish.

What is documented includes:

**Program Scope:** [Section: BC-PROD-004: Jumbo Mortgage Program] "First-lien mortgages on U.S. residential properties exceeding $1.5M."

**Required Documentation:** Applicants must provide [Fact: required_document] "Prior 2 years of Tax 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 22

---
