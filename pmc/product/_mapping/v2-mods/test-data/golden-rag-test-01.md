# RAG Golden-Set Regression Test Report

**Run ID:** 0e97068c-f9b6-4488-b3b2-a7885e9d75e5
**Started:** 2026-02-18T22:15:22.816Z
**Completed:** 2026-02-18T22:19:17.687Z
**Duration:** 235s
**Result:** FAIL (target: >=85%)
**Embedding Run:** 5e3fd093-7939-468c-9a2b-4c23e4af6718

## Summary

| Metric | Value |
|--------|-------|
| Pass Rate | 45% |
| Passed | 9 |
| Failed | 11 |
| Errored | 0 |
| Avg Response Time | 11s |
| Avg Self-Eval Score | 31% |

## Difficulty Breakdown

| Difficulty | Passed | Total | Rate |
|------------|--------|-------|------|
| easy | 2 | 5 | 40% |
| medium | 4 | 9 | 44% |
| hard | 3 | 6 | 50% |

## Preflight Checks

**Overall:** PASSED

- [PASS] **Document Exists** — Sun-Chip-Bank-Policy-Document-v2.0.md | status=ready
- [PASS] **Knowledge Base Link** — knowledge_base_id: bbe2096c...
- [PASS] **Embeddings Exist** — 1000 embeddings (tier1: 1, tier2: 29, tier3: 970) | single run ~2026-02-18T19:52Z | 1000 untagged (legacy)
- [PASS] **RPC Function (match_rag_embeddings_kb)** — RPC available and callable
- [PASS] **Anthropic API Key** — ANTHROPIC_API_KEY set (sk-ant-...LQAA)
- [PASS] **OpenAI API Key** — OPENAI_API_KEY set (sk-pr...nGkA)

## Individual Results

### Failed (11)

#### GS-002: FAIL [easy]

**Question:** What is the minimum FICO score for conventional loans?
**Expected substring:** `620`
**Self-eval:** 0%
**Response time:** 9s
**Category:** direct-lookup

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-003: FAIL [easy]

**Question:** What are the wire transfer cutoff times?
**Expected substring:** `cutoff`
**Self-eval:** 0%
**Response time:** 6s
**Category:** direct-lookup

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-004: FAIL [easy]

**Question:** What is the maximum cash deposit without enhanced due diligence?
**Expected substring:** `10,000`
**Self-eval:** 0%
**Response time:** 7s
**Category:** direct-lookup

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-008: FAIL [medium]

**Question:** What happens when a wire transfer is flagged for review?
**Expected substring:** `escalat`
**Self-eval:** 0%
**Response time:** 7s
**Category:** rule-exception

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-009: FAIL [medium]

**Question:** What are the escalation levels for BSA/AML alerts?
**Expected substring:** `compliance`
**Self-eval:** 0%
**Response time:** 7s
**Category:** rule-exception

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-011: FAIL [medium]

**Question:** What does DTI stand for in lending context?
**Expected substring:** `debt-to-income`
**Self-eval:** 0%
**Response time:** 6s
**Category:** definition

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-012: FAIL [medium]

**Question:** What is the definition of a jumbo mortgage?
**Expected substring:** `conforming`
**Self-eval:** 92%
**Response time:** 14s
**Category:** definition

**Response (first 500 chars):**

```
Based on the Sun Chip Private Bank Institutional Sovereign Manual, a jumbo mortgage is defined within [Section: BC-PROD-004: Jumbo Mortgage Program]. The program's purpose is [Section: BC-PROD-004] "to facilitate the purchase of high-value primary residences for Sun Chip clients with ultra-strict underwriting." More specifically, jumbo mortgages are [Section: BC-PROD-004] "first-lien mortgages on U.S. residential properties exceeding $1.5M." The program establishes strict underwriting requiremen
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 2
- Facts retrieved: 0

---

#### GS-014: FAIL [medium]

**Question:** What interest rates apply to certificates of deposit?
**Expected substring:** `rate`
**Self-eval:** 0%
**Response time:** 5s
**Category:** table-data

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-015: FAIL [hard]

**Question:** What documents do I need to open an account?
**Expected substring:** `identification`
**Self-eval:** 15%
**Response time:** 16s
**Category:** cross-section

**Response (first 500 chars):**

```
The provided context does not contain specific information about the documents required to open a Sun Chip Private Bank account. While the document establishes that [Section: 2. Eligibility Standards] requires a minimum of $10,000,000 in liquid assets (DAB) for account eligibility, and [Section: 5. Compliance Frameworks] mentions enhanced Source of Wealth (SOW) verification requirements, the context does not detail the actual account opening documentation checklist.

The document does reference 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-016: FAIL [hard]

**Question:** Compare the lending requirements for conventional vs jumbo mortgages
**Expected substring:** `jumbo`
**Self-eval:** 0%
**Response time:** 4s
**Category:** cross-section

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

#### GS-020: FAIL [hard]

**Question:** What are the complete steps for processing a mortgage application from start to finish?
**Expected substring:** `appraisal`
**Self-eval:** 0%
**Response time:** 7s
**Category:** cross-section

**Response (first 500 chars):**

```
I could not find relevant information in the knowledge base to answer this question.
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 0
- Facts retrieved: 0

---

### Passed (9)

#### GS-001: PASS [easy]

**Question:** What is the DTI limit for jumbo mortgages?
**Expected substring:** `43%`
**Self-eval:** 95%
**Response time:** 16s
**Category:** direct-lookup

**Response (first 500 chars):**

```
The Debt-to-Income (DTI) ratio for jumbo mortgages is capped at 43% [Section: BC-PROD-004: Jumbo Mortgage Program]. This limit is established as a standard policy rule (R4) and is also listed in the Limits & Thresholds section as "Max DTI: 43.0%" [Section: BC-PROD-004: Jumbo Mortgage Program].

However, there is one exception to this standard limit. Under exception E1, titled "High Liquidity Offset," the DTI may be expanded to 45% if the client holds 60 or more months of PITI reserves at Sun Chi
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-005: PASS [easy]

**Question:** What is the FDIC insurance coverage limit?
**Expected substring:** `250,000`
**Self-eval:** 85%
**Response time:** 13s
**Category:** direct-lookup

**Response (first 500 chars):**

```
According to the Sun Chip Private Bank Institutional Sovereign Manual, the maximum FDIC coverage limit is [Section: BC-PROD-002: Treasury Ladder Automation] $100,000,000.00 USD, which is achieved through the automated sweep program. Additionally, the policy specifies that [Section: BC-PROD-002: Treasury Ladder Automation] individual partner banks in the Insured Network each hold up to $250,000.00 of the client's cash, and [Section: BC-PROD-002: Treasury Ladder Automation] a minimum Operational B
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-006: PASS [medium]

**Question:** Can the DTI limit be exceeded for jumbo mortgages?
**Expected substring:** `45%`
**Self-eval:** 95%
**Response time:** 13s
**Category:** rule-exception

**Response (first 500 chars):**

```
Yes, the DTI limit can be exceeded for jumbo mortgages under specific circumstances. [Section: BC-PROD-004: Jumbo Mortgage Program] The standard policy caps the Debt-to-Income (DTI) ratio at 43%, as stated in R4 of the policy rules. However, [Section: BC-PROD-004: Jumbo Mortgage Program] Exception E1, titled "High Liquidity Offset," allows the DTI to be expanded to 45% if the client holds 60 or more months of PITI reserves at Sun Chip. This exception provides a mechanism for qualifying clients w
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-007: PASS [medium]

**Question:** Are there any exceptions to the minimum down payment requirement?
**Expected substring:** `exception`
**Self-eval:** 92%
**Response time:** 14s
**Category:** rule-exception

**Response (first 500 chars):**

```
Based on the provided context, there are no exceptions documented to the minimum down payment requirement for the Jumbo Mortgage Program. [Section: BC-PROD-004: Jumbo Mortgage Program] establishes that "R1: Minimum down payment is 20% of the purchase price." [Section: BC-PROD-004: Jumbo Mortgage Program]

While the document does include a general exceptions framework through [Section: BC-EXCP-001: Unified Exception Request Protocol], which allows for formal exception requests to BC-series polici
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-010: PASS [medium]

**Question:** What documents are needed for a jumbo mortgage application?
**Expected substring:** `tax`
**Self-eval:** 85%
**Response time:** 14s
**Category:** rule-exception

**Response (first 500 chars):**

```
For a jumbo mortgage application under Sun Chip's BC-PROD-004 program, three categories of required documents must be submitted [Section: BC-PROD-004: Jumbo Mortgage Program]:

1. **Tax and Income Documentation**: [Section: BC-PROD-004: Jumbo Mortgage Program] "Prior 2 years of Tax Returns and W-2s" are required for all applicants.

2. **Asset Seasoning History**: [Section: BC-PROD-004: Jumbo Mortgage Program] "Prior 60 days of asset seasoning history" must be provided to verify the stability an
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-013: PASS [medium]

**Question:** What are the fee tiers for different account types?
**Expected substring:** `fee`
**Self-eval:** 15%
**Response time:** 14s
**Category:** table-data

**Response (first 500 chars):**

```
The provided context does not contain information about fee tiers for different account types. While the document is the Sun Chip Private Bank Institutional Sovereign Manual (v2.0) covering operations for ultra-high-net-worth clients, the sections included focus on eligibility standards, security protocols, money movement rules, compliance frameworks, product specifications, family office governance, and exception handling. The only fee mentioned is an [Section: Exceptions and Approvals Framewor
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-017: PASS [hard]

**Question:** What audit requirements apply to wire transfers over $50,000?
**Expected substring:** `audit`
**Self-eval:** 15%
**Response time:** 16s
**Category:** cross-section

**Response (first 500 chars):**

```
The provided context does not contain specific audit requirements for wire transfers over $50,000. While the document establishes comprehensive operational governance for Sun Chip Private Bank's ultra-high-net-worth clients, the detailed wire transfer audit specifications are not included in the sections provided.

The context does reference [Section: 4. Money Movement Rules] which covers wire transfers and mentions mandatory cooling-off periods, but the specific audit requirements, thresholds, 
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-018: PASS [hard]

**Question:** What are all the circumstances that require manager approval?
**Expected substring:** `approv`
**Self-eval:** 25%
**Response time:** 19s
**Category:** cross-section

**Response (first 500 chars):**

```
Based on the provided context, manager approval is required in the following circumstances:

1. **Mortgage Underwriting**: [Section: BC-PROD-004: Jumbo Mortgage Program] requires approval from the "Head of Lending" for all jumbo mortgage applications exceeding $1.5M on U.S. residential properties.

2. **Appraisal Disputes**: [Section: BC-PROD-004: Jumbo Mortgage Program] specifies that appraisal disputes require approval from the "Chief Appraiser."

3. **Financial Exceptions Over $5M**: [Section
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---

#### GS-019: PASS [hard]

**Question:** How do the compliance requirements differ between domestic and international wire transfers?
**Expected substring:** `international`
**Self-eval:** 15%
**Response time:** 15s
**Category:** cross-section

**Response (first 500 chars):**

```
The provided context does not contain sufficient information to answer your question about the specific compliance requirements that differ between domestic and international wire transfers. While the document mentions money movement rules for wires as one of its eight major domains, the actual detailed policies comparing domestic versus international wire transfer requirements are not included in the sections provided. The document overview indicates that [Section: Document Overview] covers "Mo
```

**Diagnostics:**
- HyDE generated: yes
- Sections retrieved: 1
- Facts retrieved: 0

---
