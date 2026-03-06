# Multi-Document Retrieval Specification
Now we are going to build the Multi-Rag Retrieval Specification.

## Background & Foundation
As part of this current phase of this project we built into the foundation the ability to do multi-document retrieval.
Where multi-document retrieval is the same as:
- Multi-document Q&A (questions that require information from multiple sources)

Now we need to confirm that foundation has been built.
Once that is confirmed we will build the multi-document retrieval functionality.

Read about the multi-doc foundation overview here:
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\original\004-multi-doc-overview_v1.md


And read about the multi-doc foundation details here:
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\original\013-rag-multi-ingestion-upgrade_v1.md
and this
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\original\012-rag-ingestion-upgrade-and-integration_v2.md

has this foundation been finished successfully? It was supposed to be foundational for the RAG engine.

Next review all of this documentation to review the multi-document retrieval concepts.
This review includes major sections of:
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\original\004-multi-doc-environment-overview_v1.md

C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\original\006-multi-doc-explained_v1.md

This document describes the environment necessary for multi-document retrieval to work:
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\original\012-input-prompt-multi-doc-environment_v1.md

If this was implemented, as we expect, then this document also becomes a good source of multi-document retrieval operations and functionality.

This one answers further questions about the multi-doc retrieval environment: 
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\original\012-rag-ingestion-upgrade-and-integration_v2.md

---
## Build Goal
Now we need to build the actual specification for the multi-doc retrieval functionality.
I believe each knowledge base should be able to have multiple documents uploaded, embedded, and retrieved.
I believe we should run GraphRAG as a Python microservice.

---

## Outstanding Questions
Think about this too:
* **Document parsing** (optional depending on input types): if you ingest PDFs/Docs, you’ll want a parser/extractor library/service.
**James Question:** Do we need more document parsing or did we implement this already? 

**James Question:**: Is there another solution for implementing multi-document RAG beyond LazyGraphRAG?
Are there services we can use, paid or otherwise?
