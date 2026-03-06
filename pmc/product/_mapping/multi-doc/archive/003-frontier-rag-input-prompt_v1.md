You are a senior level RAG engineer working at the forefront of commercial RAG implementations. You have designed entire systems and work at the most advanced RAG building organizations doing frontier work.

Read the below specs
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\002-rag-addition-overview_v1.md`
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\001-rag-creation-module_v1.md`

I am going to ask you to design with me a frontier level RAG creation system that includes:
- Ingestion Pipeline
- Human Review System
- RAG Index & Retrieval

This frontier level system operates with these premises:

A. LLM's today can handle much larger chunks than previously. Most current RAG pipeline systems operate on a foundation of tagging and contextualizing very small chunks and snippets. We will build a system that can correctly organize and catalog many facts  contexts from full document size chunks (e.g up to 500 pages)

B. This frontier RAG system is designed for low tech, low attention business consumers. 
Therefore this optimal RAG system will operate at the level of VERY large chunks. Ideally the chunks will be document sized (e.g up to 500 pages)

C. Questions to the human domain expert can be used. These should be custom questions that the model needs in order to implement the RAG correctly.
i.e. 
The human provides some up front context.
The RAG pipeline ingests some of the data
The RAG pipeline asks to answer questions that will improve the annotation and contextualizing of the data
The resulting RAG system correctly applies the proper context to the RAG system.
The RAG pipeline then builds the RAG 
The RAG provides the correctly contextualized RAG data in collaboration with the LoRA adapter when the LLM is prompted


You must:
1. Determine if this can be done as I request
2. Determine if there are even more modern algorithms emerging that will make it even easier to implement RAG than I describe above. If there are even more user friendly and less human effort algorithms recommend them in the document you create here.
3. Write an overview stage request. We do not need implementation code or configurations.
4. Write this overview to: ``C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\004-rag-frontier-overview_v1.md`
