
▶ [2/3] Adding head_dim=128 to config.json...
Added head_dim=128

▶ [3/3] Starting vLLM server on port 8000...
   Wait for: 'Uvicorn running on http://0.0.0.0:8000'
═══════════════════════════════════════════════════════
═══════════════════════════════════════════════════════════
  Starting vLLM Control Server (Base Model Only)
═══════════════════════════════════════════════════════════
Model: /workspace/models/mistralai/Mistral-7B-Instruct-v0.2
Port: 8000
Mode: Base model (no adapter)
═══════════════════════════════════════════════════════════
INFO 01-28 01:26:48 api_server.py:712] vLLM API server version 0.6.6
INFO 01-28 01:26:48 api_server.py:713] args: Namespace(host='0.0.0.0', port=8000, uvicorn_log_level='info', allow_credentials=False, allowed_origins=['*'], allowed_methods=['*'], allowed_headers=['*'], api_key=None, lora_modules=None, prompt_adapters=None, chat_template=None, chat_template_content_format='auto', response_role='assistant', ssl_keyfile=None, ssl_certfile=None, ssl_ca_certs=None, ssl_cert_reqs=0, root_path=None, middleware=[], return_tokens_as_token_ids=False, disable_frontend_multiprocessing=False, enable_request_id_headers=False, enable_auto_tool_choice=False, tool_call_parser=None, tool_parser_plugin='', model='/workspace/models/mistralai/Mistral-7B-Instruct-v0.2', task='auto', tokenizer=None, skip_tokenizer_init=False, revision=None, code_revision=None, tokenizer_revision=None, tokenizer_mode='auto', trust_remote_code=True, allowed_local_media_path=None, download_dir=None, load_format='auto', config_format=<ConfigFormat.AUTO: 'auto'>, dtype='bfloat16', kv_cache_dtype='auto', quantization_param_path=None, max_model_len=4096, guided_decoding_backend='xgrammar', logits_processor_pattern=None, distributed_executor_backend=None, worker_use_ray=False, pipeline_parallel_size=1, tensor_parallel_size=1, max_parallel_loading_workers=None, ray_workers_use_nsight=False, block_size=None, enable_prefix_caching=None, disable_sliding_window=False, use_v2_block_manager=True, num_lookahead_slots=0, seed=0, swap_space=4, cpu_offload_gb=0, gpu_memory_utilization=0.9, num_gpu_blocks_override=None, max_num_batched_tokens=None, max_num_seqs=None, max_logprobs=20, disable_log_stats=False, quantization=None, rope_scaling=None, rope_theta=None, hf_overrides=None, enforce_eager=False, max_seq_len_to_capture=8192, disable_custom_all_reduce=False, tokenizer_pool_size=0, tokenizer_pool_type='ray', tokenizer_pool_extra_config=None, limit_mm_per_prompt=None, mm_processor_kwargs=None, disable_mm_preprocessor_cache=False, enable_lora=False, enable_lora_bias=False, max_loras=1, max_lora_rank=16, lora_extra_vocab_size=256, lora_dtype='auto', long_lora_scaling_factors=None, max_cpu_loras=None, fully_sharded_loras=False, enable_prompt_adapter=False, max_prompt_adapters=1, max_prompt_adapter_token=0, device='auto', num_scheduler_steps=1, multi_step_stream_outputs=True, scheduler_delay_factor=0.0, enable_chunked_prefill=None, speculative_model=None, speculative_model_quantization=None, num_speculative_tokens=None, speculative_disable_mqa_scorer=False, speculative_draft_tensor_parallel_size=None, speculative_max_model_len=None, speculative_disable_by_batch_size=None, ngram_prompt_lookup_max=None, ngram_prompt_lookup_min=None, spec_decoding_acceptance_method='rejection_sampler', typical_acceptance_sampler_posterior_threshold=None, typical_acceptance_sampler_posterior_alpha=None, disable_logprobs_during_spec_decoding=None, model_loader_extra_config=None, ignore_patterns=[], preemption_mode=None, served_model_name=None, qlora_adapter_name_or_path=None, otlp_traces_endpoint=None, collect_detailed_traces=None, disable_async_output_proc=False, scheduling_policy='fcfs', override_neuron_config=None, override_pooler_config=None, compilation_config=None, kv_transfer_config=None, worker_cls='auto', generation_config=None, disable_log_requests=True, max_log_len=None, disable_fastapi_docs=False, enable_prompt_tokens_details=False)
INFO 01-28 01:26:48 api_server.py:199] Started engine process with PID 839
`torch_dtype` is deprecated! Use `dtype` instead!
`torch_dtype` is deprecated! Use `dtype` instead!
INFO 01-28 01:26:53 config.py:510] This model supports multiple tasks: {'classify', 'embed', 'score', 'reward', 'generate'}. Defaulting to 'generate'.
Traceback (most recent call last):
  File "<frozen runpy>", line 198, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "/usr/local/lib/python3.11/dist-packages/vllm/entrypoints/openai/api_server.py", line 774, in <module>
    uvloop.run(run_server(args))
  File "/usr/local/lib/python3.11/dist-packages/uvloop/__init__.py", line 92, in run
    return runner.run(wrapper())
           ^^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.11/asyncio/runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "uvloop/loop.pyx", line 1518, in uvloop.loop.Loop.run_until_complete
  File "/usr/local/lib/python3.11/dist-packages/uvloop/__init__.py", line 48, in wrapper
    return await main
           ^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/entrypoints/openai/api_server.py", line 740, in run_server
    async with build_async_engine_client(args) as engine_client:
  File "/usr/lib/python3.11/contextlib.py", line 210, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/entrypoints/openai/api_server.py", line 118, in build_async_engine_client
    async with build_async_engine_client_from_engine_args(
  File "/usr/lib/python3.11/contextlib.py", line 210, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/entrypoints/openai/api_server.py", line 213, in build_async_engine_client_from_engine_args
    mq_engine_client = await asyncio.get_running_loop().run_in_executor(
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.11/concurrent/futures/thread.py", line 58, in run
    result = self.fn(*self.args, **self.kwargs)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/client.py", line 93, in __init__
    self.tokenizer = init_tokenizer_from_configs(
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/__init__.py", line 34, in init_tokenizer_from_configs
    return get_tokenizer_group(parallel_config.tokenizer_pool_config,
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/__init__.py", line 55, in get_tokenizer_group
    return tokenizer_cls.from_config(tokenizer_pool_config, **init_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/tokenizer_group.py", line 31, infrom_config
    return cls(**init_kwargs)
           ^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/tokenizer_group.py", line 23, in__init__
    self.tokenizer = get_tokenizer(self.tokenizer_id, **tokenizer_config)
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer.py", line 177, in get_tokenizer
    tokenizer = get_cached_tokenizer(tokenizer)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer.py", line 35, in get_cached_tokenizer
    tokenizer.all_special_tokens_extended)
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/transformers/tokenization_utils_base.py", line 1326, in __getattr__
    raise AttributeError(f"{self.__class__.__name__} has no attribute {key}")
AttributeError: TokenizersBackend has no attribute all_special_tokens_extended. Did you mean: 'num_special_tokens_to_add'?
INFO 01-28 01:26:57 config.py:510] This model supports multiple tasks: {'classify', 'embed', 'score', 'generate', 'reward'}. Defaulting to 'generate'.
INFO 01-28 01:26:57 llm_engine.py:234] Initializing an LLM engine (v0.6.6) with config: model='/workspace/models/mistralai/Mistral-7B-Instruct-v0.2', speculative_config=None, tokenizer='/workspace/models/mistralai/Mistral-7B-Instruct-v0.2', skip_tokenizer_init=False, tokenizer_mode=auto, revision=None, override_neuron_config=None, tokenizer_revision=None, trust_remote_code=True, dtype=torch.bfloat16, max_seq_len=4096, download_dir=None, load_format=LoadFormat.AUTO, tensor_parallel_size=1, pipeline_parallel_size=1, disable_custom_all_reduce=False, quantization=None, enforce_eager=False, kv_cache_dtype=auto, quantization_param_path=None, device_config=cuda, decoding_config=DecodingConfig(guided_decoding_backend='xgrammar'), observability_config=ObservabilityConfig(otlp_traces_endpoint=None, collect_model_forward_time=False, collect_model_execute_time=False), seed=0, served_model_name=/workspace/models/mistralai/Mistral-7B-Instruct-v0.2, num_scheduler_steps=1, multi_step_stream_outputs=True, enable_prefix_caching=False, chunked_prefill_enabled=False, use_async_output_proc=True, disable_mm_preprocessor_cache=False, mm_processor_kwargs=None, pooler_config=None, compilation_config={"splitting_ops":["vllm.unified_attention","vllm.unified_attention_with_output"],"candidate_compile_sizes":[],"compile_sizes":[],"capture_sizes":[256,248,240,232,224,216,208,200,192,184,176,168,160,152,144,136,128,120,112,104,96,88,80,72,64,56,48,40,32,24,16,8,4,2,1],"max_capture_size":256}, use_cached_outputs=True,
ERROR 01-28 01:26:57 engine.py:366] TokenizersBackend has no attribute all_special_tokens_extended
ERROR 01-28 01:26:57 engine.py:366] Traceback (most recent call last):
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/engine.py", line 357, in run_mp_engine
ERROR 01-28 01:26:57 engine.py:366]     engine = MQLLMEngine.from_engine_args(engine_args=engine_args,
ERROR 01-28 01:26:57 engine.py:366]              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/engine.py", line 119, in from_engine_args
ERROR 01-28 01:26:57 engine.py:366]     return cls(ipc_path=ipc_path,
ERROR 01-28 01:26:57 engine.py:366]            ^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/engine.py", line 71, in __init__
ERROR 01-28 01:26:57 engine.py:366]     self.engine = LLMEngine(*args, **kwargs)
ERROR 01-28 01:26:57 engine.py:366]                   ^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/engine/llm_engine.py", line 246, in __init__
ERROR 01-28 01:26:57 engine.py:366]     self.tokenizer = self._init_tokenizer()
ERROR 01-28 01:26:57 engine.py:366]                      ^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/engine/llm_engine.py", line 561, in _init_tokenizer
ERROR 01-28 01:26:57 engine.py:366]     return init_tokenizer_from_configs(
ERROR 01-28 01:26:57 engine.py:366]            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/__init__.py", line 34, in init_tokenizer_from_configs
ERROR 01-28 01:26:57 engine.py:366]     return get_tokenizer_group(parallel_config.tokenizer_pool_config,
ERROR 01-28 01:26:57 engine.py:366]            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/__init__.py", line 55, in get_tokenizer_group
ERROR 01-28 01:26:57 engine.py:366]     return tokenizer_cls.from_config(tokenizer_pool_config, **init_kwargs)
ERROR 01-28 01:26:57 engine.py:366]            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/tokenizer_group.py", line 31, in from_config
ERROR 01-28 01:26:57 engine.py:366]     return cls(**init_kwargs)
ERROR 01-28 01:26:57 engine.py:366]            ^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/tokenizer_group.py", line 23, in __init__
ERROR 01-28 01:26:57 engine.py:366]     self.tokenizer = get_tokenizer(self.tokenizer_id, **tokenizer_config)
ERROR 01-28 01:26:57 engine.py:366]                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer.py", line 177, in get_tokenizer
ERROR 01-28 01:26:57 engine.py:366]     tokenizer = get_cached_tokenizer(tokenizer)
ERROR 01-28 01:26:57 engine.py:366]                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer.py", line 35, in get_cached_tokenizer
ERROR 01-28 01:26:57 engine.py:366]     tokenizer.all_special_tokens_extended)
ERROR 01-28 01:26:57 engine.py:366]     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
ERROR 01-28 01:26:57 engine.py:366]   File "/usr/local/lib/python3.11/dist-packages/transformers/tokenization_utils_base.py", line 1326, in __getattr__
ERROR 01-28 01:26:57 engine.py:366]     raise AttributeError(f"{self.__class__.__name__} has no attribute {key}")
ERROR 01-28 01:26:57 engine.py:366] AttributeError: TokenizersBackend has no attribute all_special_tokens_extended
Process SpawnProcess-1:
Traceback (most recent call last):
  File "/usr/lib/python3.11/multiprocessing/process.py", line 314, in _bootstrap
    self.run()
  File "/usr/lib/python3.11/multiprocessing/process.py", line 108, in run
    self._target(*self._args, **self._kwargs)
  File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/engine.py", line 368, in run_mp_engine
    raise e
  File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/engine.py", line 357, in run_mp_engine
    engine = MQLLMEngine.from_engine_args(engine_args=engine_args,
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/engine.py", line 119, in from_engine_args
    return cls(ipc_path=ipc_path,
           ^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/engine/multiprocessing/engine.py", line 71, in __init__
    self.engine = LLMEngine(*args, **kwargs)
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/engine/llm_engine.py", line 246, in __init__
    self.tokenizer = self._init_tokenizer()
                     ^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/engine/llm_engine.py", line 561, in _init_tokenizer
    return init_tokenizer_from_configs(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/__init__.py", line 34, in init_tokenizer_from_configs
    return get_tokenizer_group(parallel_config.tokenizer_pool_config,
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/__init__.py", line 55, in get_tokenizer_group
    return tokenizer_cls.from_config(tokenizer_pool_config, **init_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/tokenizer_group.py", line 31, infrom_config
    return cls(**init_kwargs)
           ^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer_group/tokenizer_group.py", line 23, in__init__
    self.tokenizer = get_tokenizer(self.tokenizer_id, **tokenizer_config)
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer.py", line 177, in get_tokenizer
    tokenizer = get_cached_tokenizer(tokenizer)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/vllm/transformers_utils/tokenizer.py", line 35, in get_cached_tokenizer
    tokenizer.all_special_tokens_extended)
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/transformers/tokenization_utils_base.py", line 1326, in __getattr__
    raise AttributeError(f"{self.__class__.__name__} has no attribute {key}")
AttributeError: TokenizersBackend has no attribute all_special_tokens_extended
root@798a191c58eb:/# ^C
root@798a191c58eb:/#