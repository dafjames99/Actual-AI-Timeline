---
id: vllm
title: "vLLM released"
date: "2023-06-20"
strand: oss
summary: "Researchers at UC Berkeley released vLLM, an open-source LLM inference server using PagedAttention — a memory management algorithm that dramatically reduces KV cache waste, enabling 24× higher throughput than naive implementations."
significance: "Became the dominant open-source LLM serving framework for production deployments; PagedAttention's ideas influenced every subsequent inference engine and made high-throughput OSS inference viable."
actors:
  - UC Berkeley
tags:
  - inference
  - serving
  - open source
  - efficiency
source_url: "https://github.com/vllm-project/vllm"
related_ids:
  - llama-1
  - flashattention
  - ollama
---
