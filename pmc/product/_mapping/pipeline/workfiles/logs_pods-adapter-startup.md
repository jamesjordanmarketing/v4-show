
▶ [2/5] Logging into HuggingFace...
⚠️  Warning: 'huggingface-cli login' is deprecated. Use 'hf auth login' instead.
The token has not been saved to the git credentials helper. Pass `add_to_git_credential=True` in this function directly or `--add-to-git-credential` if using via `hf`CLI if you want to set the git credential as well.
Traceback (most recent call last):
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_http.py", line 402, in hf_raise_for_status
    response.raise_for_status()
  File "/usr/local/lib/python3.11/dist-packages/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: https://huggingface.co/api/whoami-v2

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/hf_api.py", line 1800, in whoami
    hf_raise_for_status(r)
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_http.py", line 475, in hf_raise_for_status
    raise _format(HfHubHTTPError, str(e), response) from e
huggingface_hub.errors.HfHubHTTPError: 401 Client Error: Unauthorized for url: https://huggingface.co/api/whoami-v2 (Request ID: Root=1-697968e2-24e6a78f2be2c03b7fdd0892;8e237d77-b9b2-45a1-803a-e06f6a7b4803)

User Access Token "BrightRun-Inference-Mistral" is expired

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/bin/huggingface-cli", line 8, in <module>
    sys.exit(main())
             ^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/commands/huggingface_cli.py", line 61, in main
    service.run()
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/commands/user.py", line 113, in run
    login(
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_deprecation.py", line 101, in inner_f
    return f(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_deprecation.py", line 31, in inner_f
    return f(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/_login.py", line 120, in login
    _login(token, add_to_git_credential=add_to_git_credential)
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/_login.py", line 398, in _login
    token_info = whoami(token)
                 ^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_validators.py", line 114, in _inner_fn
    return fn(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.11/dist-packages/huggingface_hub/hf_api.py", line 1814, in whoami
    raise HTTPError(error_message, request=e.request, response=e.response) from e
requests.exceptions.HTTPError: Invalid user token.