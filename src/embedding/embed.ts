import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';
import { tokenize } from './tokenizer';
import { l2Normalize } from '../utils/normalize';
import { logEmbeddingTime, logDebug, logError } from '../utils/logger';

// Singleton session instance
let session: InferenceSession | null = null;
let sessionLoading: Promise<InferenceSession> | null = null;

/**
 * Load ONNX model using onnxruntime-react-native
 * Uses singleton pattern to avoid reloading
 * @returns ONNX InferenceSession
 */
async function loadModel(): Promise<InferenceSession> {
  if (session) {
    return session;
  }
  
  // Prevent multiple simultaneous loading attempts
  if (sessionLoading) {
    return sessionLoading;
  }
  
  sessionLoading = (async () => {
    try {
      logDebug('Loading ONNX model...');
      const startTime = Date.now();
      
      // Load model asset
      const modelAsset = Asset.fromModule(
        require('../../assets/models/model_int8.onnx')
      );
      await modelAsset.downloadAsync();
      
      if (!modelAsset.localUri) {
        throw new Error('Failed to get local URI for model');
      }
      
      // Create inference session
      session = await InferenceSession.create(modelAsset.localUri);
      
      logEmbeddingTime('Model loaded', startTime);
      return session;
    } catch (error) {
      logError('Failed to load ONNX model', error);
      sessionLoading = null;
      throw error;
    }
  })();
  
  return sessionLoading;
}

/**
 * Convert token IDs to ONNX tensors
 * @param input_ids - Token ID array
 * @param attention_mask - Attention mask array
 * @returns Object with input tensors
 */
function createTensors(
  input_ids: number[],
  attention_mask: number[]
): Record<string, Tensor> {
  // Create tensors with batch dimension [1, sequence_length]
  const inputIdsTensor = new Tensor(
    'int64',
    BigInt64Array.from(input_ids.map(BigInt)),
    [1, input_ids.length]
  );
  
  const attentionMaskTensor = new Tensor(
    'int64',
    BigInt64Array.from(attention_mask.map(BigInt)),
    [1, attention_mask.length]
  );
  
  // Token type IDs (all zeros for single sequence)
  const tokenTypeIds = new Array(input_ids.length).fill(0);
  const tokenTypeIdsTensor = new Tensor(
    'int64',
    BigInt64Array.from(tokenTypeIds.map(BigInt)),
    [1, input_ids.length]
  );
  
  return {
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor,
    token_type_ids: tokenTypeIdsTensor,
  };
}

/**
 * Extract pooled output from model output
 * Uses mean pooling over token embeddings
 * @param output - Model output tensor
 * @param attentionMask - Attention mask for valid tokens
 * @returns Pooled embedding vector
 */
function extractPooledOutput(
  output: Tensor,
  attentionMask: number[]
): number[] {
  const data = output.data as Float32Array;
  const dims = output.dims;
  
  // Output shape: [batch_size, sequence_length, hidden_size]
  const seqLength = dims[1] as number;
  const hiddenSize = dims[2] as number;
  
  // Mean pooling: average embeddings of valid tokens
  const pooled: number[] = new Array(hiddenSize).fill(0);
  let validTokenCount = 0;
  
  for (let i = 0; i < seqLength; i++) {
    if (attentionMask[i] === 1) {
      for (let j = 0; j < hiddenSize; j++) {
        pooled[j] += data[i * hiddenSize + j];
      }
      validTokenCount++;
    }
  }
  
  // Average
  if (validTokenCount > 0) {
    for (let j = 0; j < hiddenSize; j++) {
      pooled[j] /= validTokenCount;
    }
  }
  
  return pooled;
}

/**
 * Generate embedding for text
 * Main function to convert text to embedding vector
 * @param text - Input text
 * @returns Normalized embedding vector
 */
export async function embedText(text: string): Promise<number[]> {
  const startTime = Date.now();
  
  try {
    // Load tokenizer and tokenize input
    const { input_ids, attention_mask } = tokenize(text);
    
    // Load model
    const model = await loadModel();
    
    // Create input tensors
    const inputs = createTensors(input_ids, attention_mask);
    
    // Run ONNX session to get embeddings
    logDebug('Running ONNX inference...');
    const results = await model.run(inputs);
    
    // Get the output tensor (last_hidden_state or sentence_embedding)
    const outputTensor = results.last_hidden_state || 
                         results.sentence_embedding ||
                         Object.values(results)[0];
    
    if (!outputTensor) {
      throw new Error('No output tensor from model');
    }
    
    // Extract pooled output
    let embedding: number[];
    
    if (outputTensor.dims.length === 2) {
      // Already pooled: [batch_size, hidden_size]
      embedding = Array.from(outputTensor.data as Float32Array);
    } else {
      // Need to pool: [batch_size, sequence_length, hidden_size]
      embedding = extractPooledOutput(outputTensor, attention_mask);
    }
    
    // Normalize embedding using L2 norm
    const normalizedEmbedding = l2Normalize(embedding);
    
    logEmbeddingTime('Embedding generated', startTime);
    logDebug('Embedding dimensions', { size: normalizedEmbedding.length });
    
    return normalizedEmbedding;
  } catch (error) {
    logError('Failed to generate embedding', error);
    throw error;
  }
}

/**
 * Preload the model for faster first embedding
 */
export async function preloadModel(): Promise<void> {
  await loadModel();
}
