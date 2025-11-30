# Knowledge Vault

A semantic note-taking mobile application with on-device Retrieval-Augmented Generation (RAG) capabilities. Built with React Native, this app enables intelligent note retrieval and context-aware search without requiring cloud services.

## Overview

Knowledge Vault addresses the challenge of finding relevant information across personal notes. Traditional keyword-based search often fails to surface contextually related content. This application implements a complete RAG pipeline locally on the device:

- **Semantic Embeddings**: Notes are converted to vector representations using an ONNX model
- **Hybrid Search**: Combines keyword matching with semantic similarity for accurate retrieval
- **Context Building**: Aggregates relevant notes into coherent context
- **Summarization**: Generates concise summaries from retrieved content

## Features

- Create, view, and manage notes with automatic embedding generation
- Real-time semantic search as you type
- RAG demonstration mode showing the complete pipeline with timing metrics
- Fully offline operation with no data leaving the device
- SQLite-based local storage

## Installation

### Prerequisites

- Node.js 18+
- React Native development environment configured for Android
- Android SDK with build tools

### Build from Source

```bash
# Clone the repository
git clone https://github.com/JashT14/Knowledge-Vault.git
cd Knowledge-Vault/KnowledgeVault

# Install dependencies
npm install

# Run on Android
npx react-native run-android
```

### Pre-built APK

Pre-built APK releases are available from the [Releases](https://github.com/JashT14/KnowledgeVault/releases) page.

## Project Structure

```
KnowledgeVault/
├── src/
│   ├── components/     # Reusable UI components
│   ├── db/             # SQLite database operations
│   ├── embedding/      # ONNX model integration and tokenization
│   ├── rag/            # Retrieval, ranking, context building, summarization
│   ├── screens/        # Application screens
│   └── utils/          # Utility functions and types
├── assets/models/      # ONNX embedding model
└── android/            # Android native code
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

Developed by [JashT14](https://github.com/JashT14)
