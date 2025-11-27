import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { tokenize } from './tokenizer';
import { l2Normalize } from '../utils/normalize';
import { logEmbeddingTime, logDebug, logError } from '../utils/logger';

// Singleton session instance
let session: InferenceSession | null = null;
let sessionLoading: Promise<InferenceSession> | null = null;

/**
 * Get the model path based on platform
 */
function getModelPath(): string {
  if (Platform.OS === 'android') {
    // For Android, the model should be in the assets/models folder
    return 'models/model_int8.onnx';
  } else {
    // For iOS, use the bundle path
    return `${RNFS.MainBundlePath}/assets/models/model_int8.onnx`;
  }
}

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
      
      const modelPath = getModelPath();
      
      // For Android, copy from assets to a readable location if needed
      let finalModelPath = modelPath;
      if (Platform.OS === 'android') {
        const destPath = `${RNFS.DocumentDirectoryPath}/model_int8.onnx`;
        
        // Check if model already exists
        const exists = await RNFS.exists(destPath);
        if (!exists) {
          // Copy from Android assets
          logDebug(`Copying model from assets: ${modelPath} to ${destPath}`);
          try {
            await RNFS.copyFileAssets(modelPath, destPath);
          } catch (copyError) {
            const copyErrorMessage = copyError instanceof Error ? copyError.message : String(copyError || 'Unknown error');
            throw new Error(`Failed to copy ONNX model from assets: ${copyErrorMessage}`);
          }
        }
        
        // Verify the model file exists after copy
        const modelExists = await RNFS.exists(destPath);
        if (!modelExists) {
          throw new Error(`ONNX model file not found at: ${destPath}`);
        }
        
        finalModelPath = destPath;
      } else {
        // For iOS, verify the model file exists
        const modelExists = await RNFS.exists(finalModelPath);
        if (!modelExists) {
          throw new Error(`ONNX model file not found at: ${finalModelPath}`);
        }
      }
      
      // Create inference session
      session = await InferenceSession.create(finalModelPath);
      
      logEmbeddingTime('Model loaded', startTime);
      return session;
    } catch (error) {
      logError('Failed to load ONNX model', error);
      sessionLoading = null;
      // Ensure error has proper message for native bridge compatibility
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error loading ONNX model');
      throw new Error(errorMessage || 'Failed to load ONNX model');
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
    // Ensure error has proper message for native bridge compatibility
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error generating embedding');
    throw new Error(errorMessage || 'Failed to generate embedding');
  }
}

/**
 * Preload the model for faster first embedding
 */
export async function preloadModel(): Promise<void> {
  await loadModel();
}
