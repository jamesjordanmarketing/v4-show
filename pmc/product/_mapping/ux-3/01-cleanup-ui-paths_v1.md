Path is:


Synthetic Dataset | Conversations | Synthetic Conversations
Conversations -> (creates the enriched conversation file. We need to change the name to "Conversation File"
Automated Conversations

Datasets(needs another name)->Import from Training File (creates the LoRA ready JSON)




I am trying to test the LoRA and am at this page:
https://v4-show.vercel.app/pipeline/jobs/[id]/test

When I choose an evaluator, which one is the "production" one that was last being used?
"Response Quality Pairwise Comparison (v1)"
or
"Response Quality Evaluator (Multi-Turn v1)"
It would have been the last one updated too.

I think there is only one that is useful for launch, but I forget which one.

The others were iterative attempts to get it to work and I think they are useless. Please confirm or correct that belief.
nvm its this one "Response Quality Evaluator (Multi-Turn v1)"



----

but aren't we asking the chat to access a specific adapter? The one we just submitted. so it only needs 1 correct?
Do we need an "adapter" selector too? Other wise how will the customer know how to be routed to the adapter they want to test (in the event there is more than one?




---
Per my query:

As you suspected, scaling your worker count to zero is the most common way to flush all active workers. 

 +1
Method: Update the endpoint configuration via the RunPod Console or the GraphQL API to set min_workers=0.

Timing: Workers will only terminate after they hit their configured Idle Timeout (minimum 1 second) (workers are frequently initializing. If I set the workers to 0 when thye are initializing it will kill those workers. So I am not sure if they won't end if they are initializing?



