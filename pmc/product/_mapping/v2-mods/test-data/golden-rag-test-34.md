# RAG Golden-Set Regression Test Report

**Run ID:** 78843779-b660-4ed3-b39f-aec925d13a13
**Started:** 2026-02-20T21:38:44.267Z
**Completed:** 2026-02-20T21:46:30.806Z
**Duration:** 467s
**Result:** PASS (target: >=85%)
**Embedding Run:** 28687ced-f4cc-4947-811d-fae06a4689c8

## Summary

| Metric | Value |
|--------|-------|
| Pass Rate | 100% |
| Passed | 20 |
| Failed | 0 |
| Errored | 0 |
| Avg Response Time | 23s |
| Avg Self-Eval Score | 44% |

## Difficulty Breakdown

| Difficulty | Passed | Total | Rate |
|------------|--------|-------|------|
| easy | 5 | 5 | 100% |
| medium | 9 | 9 | 100% |
| hard | 6 | 6 | 100% |

## Preflight Checks

**Overall:** PASSED

- [PASS] **Document Exists** — Sun-Chip-Bank-Policy-Document-v2.0.md | status=ready
- [PASS] **Knowledge Base Link** — knowledge_base_id: 4927c448...
- [PASS] **Embeddings Exist** — 1223 embeddings (tier1: 1, tier2: 29, tier3: 1193) | single run ~2026-02-20T21:28Z | 1 tagged run(s)
- [PASS] **RPC Function (match_rag_embeddings_kb)** — RPC available and callable
- [PASS] **Anthropic API Key** — ANTHROPIC_API_KEY set (sk-ant-...LQAA)
- [PASS] **OpenAI API Key** — OPENAI_API_KEY set (sk-pr...nGkA)

## Individual Results

### Passed (20)

#### GS-001: PASS [easy]

**Question:** What is the DTI limit for jumbo mortgages?
**Expected substring:** `43%`
**Self-eval:** 45%
**Response time:** 27s
**Category:** direct-lookup

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What is the DTI limit for jumbo mortgages?" in the knowledge base.

Here's what I found (low confidence):
The Debt-to-Income (DTI) ratio for jumbo mortgages at Sun Chip Private Bank is capped at 43% [Section: BC-PROD-004: Jumbo Mortgage Program]. This limit applies to all signers on the mortgage and represents a standard threshold for qualifying borrowers.

However, there is an exception to this standard limit. Under the "High Liquidity Offset" exception (E
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 24

---

#### GS-002: PASS [easy]

**Question:** What is the minimum FICO score for jumbo mortgages?
**Expected substring:** `740`
**Self-eval:** 95%
**Response time:** 19s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The minimum FICO score for jumbo mortgages at Sun Chip Private Bank is 740. [Section: BC-PROD-004: Jumbo Mortgage Program] This requirement applies to all signers on the mortgage, not just the primary borrower. [Section: BC-PROD-004: Jumbo Mortgage Program] Specifically, policy rule R2 states that 'Minimum FICO score of 740 is required for all signers.' [Section: BC-PROD-004: Jumbo Mortgage Program]
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 26

---

#### GS-003: PASS [easy]

**Question:** What are the wire transfer cutoff times?
**Expected substring:** `cutoff`
**Self-eval:** 45%
**Response time:** 21s
**Category:** direct-lookup

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What are the wire transfer cutoff times?" in the knowledge base.

Here's what I found (low confidence):
Sun Chip Private Bank establishes specific wire transfer cutoff times based on processing urgency. The [Section: BC-WIRE-001: Outbound Domestic Wires] defines a "Priority Window" of [Section: BC-WIRE-001: Outbound Domestic Wires] "8:00 AM to 1:00 PM ET for same-day processing." This means that [Section: BC-WIRE-001: Outbound Domestic Wires] "Same-day wire
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 26

---

#### GS-004: PASS [easy]

**Question:** What triggers enhanced due diligence for source of funds?
**Expected substring:** `1,000,000`
**Self-eval:** 35%
**Response time:** 27s
**Category:** direct-lookup

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What triggers enhanced due diligence for source of funds?" in the knowledge base.

Here's what I found (low confidence):
Enhanced due diligence for source of funds at Sun Chip Private Bank is triggered by several specific conditions:

1. **Transaction Size Threshold**: [Section: BC-COMP-002] Any single inbound transaction exceeding $1,000,000.00 USD triggers Source of Funds (SOF) verification, which focuses on "the origin of the specific money used for a si
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 30

---

#### GS-005: PASS [easy]

**Question:** What is the FDIC insurance coverage limit?
**Expected substring:** `250,000`
**Self-eval:** 35%
**Response time:** 19s
**Category:** direct-lookup

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What is the FDIC insurance coverage limit?" in the knowledge base.

Here's what I found (low confidence):
According to Sun Chip Private Bank's institutional sovereign manual, the maximum FDIC insurance coverage is [Section: BC-PROD-001: Flagship Cash Account and Sweep Logic] $100,000,000.00 USD, achieved through the bank's automated sweep program that distributes client deposits across a network of partner banks.

The sweep mechanism works by [Section: BC-P
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 22

---

#### GS-006: PASS [medium]

**Question:** Can the DTI limit be exceeded for jumbo mortgages?
**Expected substring:** `45%`
**Self-eval:** 15%
**Response time:** 20s
**Category:** rule-exception

**Response (first 500 chars):**

```
I couldn't find a confident answer to "Can the DTI limit be exceeded for jumbo mortgages?" in the knowledge base.

Here's what I found (low confidence):
Yes, the DTI limit for jumbo mortgages can be exceeded under specific circumstances. [Section: BC-PROD-004: Jumbo Mortgage Program] establishes that the standard [Section: BC-PROD-004: Jumbo Mortgage Program] "Debt-to-Income (DTI) ratio is capped at 43%." However, an exception exists: [Section: BC-PROD-004: Jumbo Mortgage Program] "DTI may be ex
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 29

---

#### GS-007: PASS [medium]

**Question:** Are there any exceptions to the minimum down payment requirement?
**Expected substring:** `exception`
**Self-eval:** 25%
**Response time:** 20s
**Category:** rule-exception

**Response (first 500 chars):**

```
I couldn't find a confident answer to "Are there any exceptions to the minimum down payment requirement?" in the knowledge base.

Here's what I found (low confidence):
Based on the provided context, there are no documented exceptions to the minimum down payment requirement of 20% for jumbo mortgages. [Section: BC-PROD-004: Jumbo Mortgage Program] establishes that [Policy Rule R1] 'Minimum down payment is 20% of the purchase price.' The policy's exceptions section (E1) addresses only the Debt-to-
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 30

---

#### GS-008: PASS [medium]

**Question:** What happens when a wire transfer is flagged for review?
**Expected substring:** `escalat`
**Self-eval:** 35%
**Response time:** 25s
**Category:** rule-exception

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What happens when a wire transfer is flagged for review?" in the knowledge base.

Here's what I found (low confidence):
Based on the provided context, wire transfers are flagged for review in specific circumstances, with different protocols depending on the trigger:

**Restricted Industry Transactions:** If a wire is destined for a [Section: BC-COMP-001] "Restricted Industry" (such as cryptocurrency exchanges, cannabis-related businesses, or offshore gaming
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 30

---

#### GS-009: PASS [medium]

**Question:** What are the escalation levels for BSA/AML alerts?
**Expected substring:** `compliance`
**Self-eval:** 85%
**Response time:** 24s
**Category:** rule-exception

**Response (first 500 chars):**

```
The provided context does not contain specific information about escalation levels for BSA/AML (Bank Secrecy Act/Anti-Money Laundering) alerts. While the document establishes a comprehensive escalation matrix in [Section: Appendix D: Escalation Matrix], the examples provided focus on security breaches, margin calls, SOW discrepancies, and system outages, but do not explicitly detail BSA/AML alert escalation procedures.

The manual does reference compliance-related escalations in [Section: BC-COM
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 29

---

#### GS-010: PASS [medium]

**Question:** What documents are needed for a jumbo mortgage application?
**Expected substring:** `tax`
**Self-eval:** 15%
**Response time:** 22s
**Category:** rule-exception

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What documents are needed for a jumbo mortgage application?" in the knowledge base.

Here's what I found (low confidence):
For a jumbo mortgage application at Sun Chip Private Bank, the following documents are required:

**Primary Documents:**
[Section: BC-PROD-004: Jumbo Mortgage Program] The applicant must provide [Section: BC-PROD-004] "Prior 2 years of Tax Returns and W-2s" to verify income stability and employment history.

**Asset Documentation:**
[Se
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 24

---

#### GS-011: PASS [medium]

**Question:** What does DTI stand for in lending context?
**Expected substring:** `debt-to-income`
**Self-eval:** 35%
**Response time:** 20s
**Category:** definition

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What does DTI stand for in lending context?" in the knowledge base.

Here's what I found (low confidence):
In the lending context covered by Sun Chip Private Bank's institutional manual, DTI stands for [Section: BC-PROD-004: Jumbo Mortgage Program] "Debt-to-Income (DTI) ratio," which represents the percentage of gross monthly income that goes toward debt payments. Specifically, [Section: BC-PROD-004: Jumbo Mortgage Program] the DTI ratio is capped at 43% fo
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 29

---

#### GS-012: PASS [medium]

**Question:** What is the definition of a jumbo mortgage?
**Expected substring:** `1.5`
**Self-eval:** 45%
**Response time:** 23s
**Category:** definition

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What is the definition of a jumbo mortgage?" in the knowledge base.

Here's what I found (low confidence):
A jumbo mortgage, as defined in Sun Chip Private Bank's institutional framework, is a first-lien mortgage on a U.S. residential property exceeding $1.5M, designed to facilitate the purchase of high-value primary residences for ultra-high-net-worth clients [Section: BC-PROD-004]. The program enforces strict underwriting standards including a minimum 20%
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 24

---

#### GS-013: PASS [medium]

**Question:** What are the fee tiers for different account types?
**Expected substring:** `fee`
**Self-eval:** 15%
**Response time:** 22s
**Category:** table-data

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What are the fee tiers for different account types?" in the knowledge base.

Here's what I found (low confidence):
Based on the Sun Chip Private Bank Institutional Sovereign Manual, the document does not establish distinct 'fee tiers for different account types' in the traditional sense. Instead, Sun Chip operates a single institutional tier for clients meeting the $10,000,000.00 minimum liquid asset threshold [Section: Bank Overview and Philosophy].

Howev
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 22

---

#### GS-014: PASS [medium]

**Question:** What interest rates apply to certificates of deposit?
**Expected substring:** `rate`
**Self-eval:** 95%
**Response time:** 15s
**Category:** table-data

**Response (first 500 chars):**

```
The provided context does not contain information about certificates of deposit (CDs) or their interest rates at Sun Chip Private Bank. The manual covers several product offerings including [Section: BC-PROD-001: Flagship Cash Account and Sweep Logic], [Section: BC-PROD-002: Treasury Ladder Automation], [Section: BC-PROD-003: Securities-Backed Line of Credit (SBLOC)], and [Section: BC-PROD-004: Jumbo Mortgage Program], but none of these sections address CD products or CD interest rate structures
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 20

---

#### GS-015: PASS [hard]

**Question:** What documents do I need to open an account?
**Expected substring:** `passport`
**Self-eval:** 25%
**Response time:** 22s
**Category:** cross-section

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What documents do I need to open an account?" in the knowledge base.

Here's what I found (low confidence):
To open an account at Sun Chip Private Bank, you must provide several key documents during the onboarding phase. [Section: Appendix B: Required Documents Master Checklist]

The primary documents required are:

1. **U.S. Passport** - This is the primary identity verification document. [Section: BC-ELIG-002: U.S.-Only Residency and Re-verification]

2. 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 27

---

#### GS-016: PASS [hard]

**Question:** Compare the lending requirements for conventional vs jumbo mortgages
**Expected substring:** `jumbo`
**Self-eval:** 95%
**Response time:** 24s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided knowledge base, I can only provide information about Sun Chip Private Bank's jumbo mortgage requirements. The context does not contain information about conventional mortgage lending standards, so a direct comparison is not possible.

Sun Chip's jumbo mortgage program, detailed in [Section: BC-PROD-004: Jumbo Mortgage Program], establishes the following requirements for high-value residential properties:

**Loan Amount and Down Payment:** [Section: BC-PROD-004] specifies th
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 27

---

#### GS-017: PASS [hard]

**Question:** What audit requirements apply to wire transfers over $50,000?
**Expected substring:** `audit`
**Self-eval:** 15%
**Response time:** 25s
**Category:** cross-section

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What audit requirements apply to wire transfers over $50,000?" in the knowledge base.

Here's what I found (low confidence):
Based on the provided context, wire transfers over $50,000 are subject to several audit requirements, though the manual does not establish a specific audit threshold at exactly $50,000. Instead, audit requirements scale based on transaction size and recipient status.

For wire transfers exceeding $2,000,000, [Section: BC-WIRE-001] req
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 14
- Facts retrieved: 28

---

#### GS-018: PASS [hard]

**Question:** What are all the circumstances that require manager approval?
**Expected substring:** `approv`
**Self-eval:** 15%
**Response time:** 23s
**Category:** cross-section

**Response (first 500 chars):**

```
I couldn't find a confident answer to "What are all the circumstances that require manager approval?" in the knowledge base.

Here's what I found (low confidence):
Based on Sun Chip Private Bank's institutional manual, manager approval is required in several specific circumstances across different operational domains:

**ACH Operations:** [Section: BC-ACH-001: Automated Clearing House (ACH) and Return Management] An Operations Manager must approve limit increases for outbound ACH transfers, whic
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 12
- Facts retrieved: 30

---

#### GS-019: PASS [hard]

**Question:** How do the compliance requirements differ between domestic and international wire transfers?
**Expected substring:** `international`
**Self-eval:** 25%
**Response time:** 28s
**Category:** cross-section

**Response (first 500 chars):**

```
I couldn't find a confident answer to "How do the compliance requirements differ between domestic and international wire transfers?" in the knowledge base.

Here's what I found (low confidence):
Based on Sun Chip Private Bank's policies, there are significant compliance differences between domestic and international wire transfers:

**Domestic Wire Transfers:**
Domestic outbound wires are governed by [Section: BC-WIRE-001: Outbound Domestic Wires], which establishes the primary framework for Fed
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 11
- Facts retrieved: 25

---

#### GS-020: PASS [hard]

**Question:** What are the complete steps for processing a mortgage application from start to finish?
**Expected substring:** `appraisal`
**Self-eval:** 85%
**Response time:** 24s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided context, I can only offer a partial answer about mortgage application processing, as the knowledge base does not contain a complete end-to-end workflow.

What is documented:

**Eligibility and Underwriting Standards:**
The [Section: BC-PROD-004: Jumbo Mortgage Program] establishes that Sun Chip's jumbo mortgage program applies to "first-lien mortgages on U.S. residential properties exceeding $1.5M" and requires strict underwriting criteria including [Section: BC-PROD-004] "
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 10
- Facts retrieved: 23

---
