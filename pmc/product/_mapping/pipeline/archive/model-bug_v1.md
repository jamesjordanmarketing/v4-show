james@BrightHub ~/Master/BrightHub/BRun/brightrun-trainer  $ docker build -t brighthub/brightrun-trainer:v15 .
[+] Building 6.9s (10/13)  docker:desktop-linux
 => [internal] load build definition from  0.0s
 => => transferring dockerfile: 961B       0.0s
 => [internal] load metadata for docker.i  1.1s
 => [auth] runpod/pytorch:pull token for   0.0s
 => [internal] load .dockerignore          0.0s
 => => transferring context: 2B            0.0s 
 => [1/8] FROM docker.io/runpod/pytorch:2  0.0s 
 => => resolve docker.io/runpod/pytorch:2  0.0s 
 => [internal] load build context          0.0s 
 => => transferring context: 32.00kB       0.0s 
 => CACHED [2/8] WORKDIR /app              0.0s 
 => CACHED [3/8] RUN apt-get update && ap  0.0s 
 => [4/8] COPY requirements.txt .          0.1s 
 => ERROR [5/8] RUN pip install --no-cach  5.6s
------
 > [5/8] RUN pip install --no-cache-dir -r requirements.txt:
0.890 Collecting transformers<5.0.0,>=4.45.0 (from -r requirements.txt (line 9))
1.023   Downloading transformers-4.57.3-py3-none-any.whl.metadata (43 kB)
1.038      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 44.0/44.0 kB 2.6 MB/s eta 0:00:00
1.070 Collecting peft<1.0.0,>=0.14.0 (from -r requirements.txt (line 10))
1.090   Downloading peft-0.18.1-py3-none-any.whl.metadata (14 kB)
1.143 Collecting accelerate>=1.3.0 (from -r requirements.txt (line 11))
1.165   Downloading accelerate-1.12.0-py3-none-any.whl.metadata (19 kB)
1.206 Collecting bitsandbytes<1.0.0,>=0.44.0 (from -r requirements.txt (line 12))
1.237   Downloading bitsandbytes-0.49.1-py3-none-manylinux_2_24_x86_64.whl.metadata (10 kB)     
1.274 Collecting trl>=0.16.0 (from -r requirements.txt (line 13))
1.300   Downloading trl-0.26.2-py3-none-any.whl.metadata (11 kB)
1.302 Requirement already satisfied: torch>=2.1.0 in /usr/local/lib/python3.10/dist-packages (from -r requirements.txt (line 16)) (2.1.0+cu118) 
1.373 Collecting sentencepiece>=0.1.99 (from -r requirements.txt (line 22))
1.401   Downloading sentencepiece-0.2.1-cp310-cp310-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl.metadata (10 kB)
1.455 Collecting tiktoken>=0.5.0 (from -r requirements.txt (line 25))
1.484   Downloading tiktoken-0.12.0-cp310-cp310-manylinux_2_28_x86_64.whl.metadata (6.7 kB)     
1.652 Collecting protobuf>=3.20.0 (from -r requirements.txt (line 28))
1.678   Downloading protobuf-6.33.4-cp39-abi3-manylinux2014_x86_64.whl.metadata (593 bytes)     
1.830 Collecting tokenizers>=0.15.0 (from -r requirements.txt (line 31))
1.849   Downloading tokenizers-0.22.2-cp39-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (7.3 kB)
1.963 Collecting safetensors>=0.4.0 (from -r requirements.txt (line 37))
1.992   Downloading safetensors-0.7.0-cp38-abi3-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (4.1 kB)
2.057 Collecting huggingface_hub>=0.20.0 (from -r requirements.txt (line 40))
2.079   Downloading huggingface_hub-1.3.1-py3-none-any.whl.metadata (13 kB)
2.109 Collecting einops>=0.7.0 (from -r requirements.txt (line 43))
2.128   Downloading einops-0.8.1-py3-none-any.whl.metadata (13 kB)
2.170 Collecting datasets<3.0.0,>=2.16.0 (from -r requirements.txt (line 48))
2.191   Downloading datasets-2.21.0-py3-none-any.whl.metadata (21 kB)
2.228 Collecting evaluate<1.0.0,>=0.4.0 (from -r requirements.txt (line 49))
2.248   Downloading evaluate-0.4.6-py3-none-any.whl.metadata (9.5 kB)
2.293 Collecting runpod<2.0.0,>=1.6.0 (from -r requirements.txt (line 57))
2.312   Downloading runpod-1.8.1-py3-none-any.whl.metadata (9.9 kB)
2.371 Collecting supabase<3.0.0,>=2.0.0 (from -r requirements.txt (line 60))
2.393   Downloading supabase-2.27.1-py3-none-any.whl.metadata (4.6 kB)
2.727 Collecting boto3>=1.34.0 (from -r requirements.txt (line 63))
2.750   Downloading boto3-1.42.26-py3-none-any.whl.metadata (6.8 kB)
2.751 Requirement already satisfied: requests<3.0.0,>=2.31.0 in /usr/local/lib/python3.10/dist-packages (from -r requirements.txt (line 68)) (2.31.0)
2.752 Requirement already satisfied: numpy<2.0.0,>=1.24.0 in /usr/local/lib/python3.10/dist-packages (from -r requirements.txt (line 69)) (1.24.1)
2.871 Collecting scipy<2.0.0,>=1.11.0 (from -r requirements.txt (line 70))
2.900   Downloading scipy-1.15.3-cp310-cp310-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (61 kB)
2.903      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 62.0/62.0 kB 42.1 MB/s eta 0:00:00
2.938 Collecting python-dotenv>=1.0.0 (from -r requirements.txt (line 71))
2.961   Downloading python_dotenv-1.2.1-py3-none-any.whl.metadata (25 kB)
2.988 Collecting pynvml<12.0.0,>=11.5.0 (from -r requirements.txt (line 74))
3.013   Downloading pynvml-11.5.3-py3-none-any.whl.metadata (8.8 kB)
3.280 Requirement already satisfied: filelock in /usr/local/lib/python3.10/dist-packages (from transformers<5.0.0,>=4.45.0->-r requirements.txt (line 9)) (3.9.0)
3.292 Collecting huggingface_hub>=0.20.0 (from -r requirements.txt (line 40))
3.327   Downloading huggingface_hub-0.36.0-py3-none-any.whl.metadata (14 kB)
3.328 Requirement already satisfied: packaging>=20.0 in /usr/local/lib/python3.10/dist-packages (from transformers<5.0.0,>=4.45.0->-r requirements.txt (line 9)) (23.2)
3.329 Requirement already satisfied: pyyaml>=5.1 in /usr/local/lib/python3.10/dist-packages (from transformers<5.0.0,>=4.45.0->-r requirements.txt (line 9)) (6.0.1)
3.655 Collecting regex!=2019.12.17 (from transformers<5.0.0,>=4.45.0->-r requirements.txt (line 9))
3.676   Downloading regex-2025.11.3-cp310-cp310-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (40 kB)
3.678      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 40.5/40.5 kB 51.5 MB/s eta 0:00:00
3.738 Collecting tqdm>=4.27 (from transformers<5.0.0,>=4.45.0->-r requirements.txt (line 9))    
3.765   Downloading tqdm-4.67.1-py3-none-any.whl.metadata (57 kB)
3.768      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 57.7/57.7 kB 25.7 MB/s eta 0:00:00
3.782 Requirement already satisfied: psutil in /usr/local/lib/python3.10/dist-packages (from peft<1.0.0,>=0.14.0->-r requirements.txt (line 10)) (5.9.6)
3.888 Collecting torch>=2.1.0 (from -r requirements.txt (line 16))
3.908   Downloading torch-2.9.1-cp310-cp310-manylinux_2_28_x86_64.whl.metadata (30 kB)
3.935 INFO: pip is looking at multiple versions of trl to determine which version is compatible with other requirements. This could take a while.
3.938 Collecting trl>=0.16.0 (from -r requirements.txt (line 13))
3.961   Downloading trl-0.26.1-py3-none-any.whl.metadata (11 kB)
4.007   Downloading trl-0.26.0-py3-none-any.whl.metadata (11 kB)
4.073   Downloading trl-0.25.1-py3-none-any.whl.metadata (11 kB)
4.115   Downloading trl-0.25.0-py3-none-any.whl.metadata (11 kB)
4.167   Downloading trl-0.24.0-py3-none-any.whl.metadata (11 kB)
4.214   Downloading trl-0.23.1-py3-none-any.whl.metadata (11 kB)
4.262   Downloading trl-0.23.0-py3-none-any.whl.metadata (11 kB)
4.283 INFO: pip is still looking at multiple versions of trl to determine which version is compatible with other requirements. This could take a while.
4.317   Downloading trl-0.22.2-py3-none-any.whl.metadata (11 kB)
4.360   Downloading trl-0.22.1-py3-none-any.whl.metadata (11 kB)
4.406   Downloading trl-0.22.0-py3-none-any.whl.metadata (11 kB)
4.455   Downloading trl-0.21.0-py3-none-any.whl.metadata (11 kB)
4.499   Downloading trl-0.20.0-py3-none-any.whl.metadata (11 kB)
4.516 INFO: This is taking longer than usual. You might need to provide the dependency resolver with stricter constraints to reduce runtime. See https://pip.pypa.io/warnings/backtracking for guidance. If you want to abort this run, press Ctrl + C.
4.539   Downloading trl-0.19.1-py3-none-any.whl.metadata (10 kB)
4.580   Downloading trl-0.19.0-py3-none-any.whl.metadata (10 kB)
4.629   Downloading trl-0.18.2-py3-none-any.whl.metadata (11 kB)
4.673   Downloading trl-0.18.1-py3-none-any.whl.metadata (11 kB)
4.716   Downloading trl-0.18.0-py3-none-any.whl.metadata (11 kB)
4.876   Downloading trl-0.17.0-py3-none-any.whl.metadata (12 kB)
4.991   Downloading trl-0.16.1-py3-none-any.whl.metadata (12 kB)
5.102   Downloading trl-0.16.0-py3-none-any.whl.metadata (12 kB)
5.129 ERROR: Cannot install -r requirements.txt (line 13) and datasets<3.0.0 and >=2.16.0 because these package versions have conflicting dependencies.
5.130
5.130 The conflict is caused by:
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.26.2 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.26.1 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.26.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.25.1 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.25.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.24.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.23.1 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.23.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.22.2 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.22.1 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.22.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.21.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.20.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.19.1 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.19.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.18.2 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.18.1 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.18.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.17.0 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.16.1 depends on datasets>=3.0.0 
5.130     The user requested datasets<3.0.0 and >=2.16.0
5.130     trl 0.16.0 depends on datasets>=3.0.0 
5.130
5.130 To fix this you could try to:
5.130 1. loosen the range of package versions you've specified
5.130 2. remove package versions to allow pip attempt to solve the dependency conflict
5.130
5.130 ERROR: ResolutionImpossible: for help visit https://pip.pypa.io/en/latest/topics/dependency-resolution/#dealing-with-dependency-conflicts 
5.239
5.239 [notice] A new release of pip is available: 23.3.1 -> 25.3
5.239 [notice] To update, run: python -m pip install --upgrade pip
------
Dockerfile:18
--------------------
  16 |     
  17 |     # Install Python dependencies        
  18 | >>> RUN pip install --no-cache-dir -r requirements.txt
  19 |
  20 |     # Copy application code
--------------------
ERROR: failed to build: failed to solve: process "/bin/bash -o pipefail -c pip install --no-cache-dir -r requirements.txt" did not complete successfully: exit code: 1

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/a2j45x5b5khzard1bo8h0irww
james@BrightHub ~/Master/BrightHub/BRun/brightrun-trainer  $