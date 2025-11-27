import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { retrieveNotesHybrid } from '../rag/retrieve';
import { topKWithThreshold } from '../rag/rank';
import { buildContext } from '../rag/contextBuilder';
import { summarize } from '../rag/summarizer';
import { RetrievalResult, BuiltContext } from '../utils/types';
import { logDebug, createTimer } from '../utils/logger';

type RAGDemoScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RAGDemo'
>;

interface Props {
  navigation: RAGDemoScreenNavigationProp;
}

/**
 * Extract keywords from text for display
 */
function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  );
}

/**
 * Check which query keywords are present in note
 */
function getMatchingKeywords(queryKeywords: Set<string>, noteText: string): string[] {
  const noteLower = noteText.toLowerCase();
  const matching: string[] = [];
  const keywordsArray = Array.from(queryKeywords);
  for (let i = 0; i < keywordsArray.length; i++) {
    const keyword = keywordsArray[i];
    if (noteLower.includes(keyword)) {
      matching.push(keyword);
    }
  }
  return matching;
}

export default function RAGDemoScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [queryKeywords, setQueryKeywords] = useState<Set<string>>(new Set());
  const [context, setContext] = useState<BuiltContext | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [timings, setTimings] = useState<{
    retrieval: number;
    ranking: number;
    context: number;
    summary: number;
    total: number;
  } | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultsAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Initial fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animate results when they change
  useEffect(() => {
    if (results.length > 0 || context || summary) {
      resultsAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(resultsAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [results, context, summary]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setQueryKeywords(new Set());
      setContext(null);
      setSummary('');
      setTimings(null);
      return;
    }

    setIsSearching(true);
    const totalStart = Date.now();
    const newTimings = { retrieval: 0, ranking: 0, context: 0, summary: 0, total: 0 };
    
    // Extract query keywords for display
    const keywords = extractKeywords(query.trim());
    setQueryKeywords(keywords);

    try {
      // Step 1: Hybrid Retrieval - combines semantic + keyword matching
      // This eliminates bias by requiring actual keyword matches
      const retrievalStart = Date.now();
      const retrievedResults = await retrieveNotesHybrid(query.trim(), 0.5);
      newTimings.retrieval = Date.now() - retrievalStart;

      // Step 2: Ranking - Get top-k results with threshold to filter low scores
      const rankingStart = Date.now();
      const topResults = topKWithThreshold(retrievedResults, 5, 0.15);
      setResults(topResults);
      newTimings.ranking = Date.now() - rankingStart;

      if (topResults.length > 0) {
        // Step 3: Context Building
        const contextStart = Date.now();
        const builtContext = buildContext(topResults, 3);
        setContext(builtContext);
        newTimings.context = Date.now() - contextStart;

        // Step 4: Summarization
        const summaryStart = Date.now();
        const summaryText = summarize(builtContext.context, 3);
        setSummary(summaryText);
        newTimings.summary = Date.now() - summaryStart;
      } else {
        setContext(null);
        setSummary('');
      }

      newTimings.total = Date.now() - totalStart;
      setTimings(newTimings);
    } catch (error) {
      logDebug('RAG Demo search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const formatSimilarity = (sim: number): string => {
    return `${Math.round(sim * 100)}%`;
  };

  const getSimilarityColor = (sim: number): string => {
    if (sim >= 0.7) return '#4caf50';
    if (sim >= 0.5) return '#ff9800';
    return '#f44336';
  };

  const handleNotePress = (noteId: number) => {
    navigation.navigate('ViewNote', { noteId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Info Banner */}
        <Animated.View style={[styles.infoBanner, { opacity: fadeAnim }]}>
          <Text style={styles.infoTitle}>RAG Pipeline Demo</Text>
          <Text style={styles.infoText}>
            This demonstrates how the Retrieval-Augmented Generation (RAG) system works.
            See the full pipeline: Embedding, Retrieval, Ranking, Context Building, Summarization
          </Text>
        </Animated.View>

        {/* Search Input */}
        <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter a query to test RAG..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Run</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Running RAG Pipeline...</Text>
          </View>
        )}

        {!isSearching && results.length > 0 && (
          <Animated.View style={{ opacity: resultsAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Pipeline Timings */}
            {timings && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pipeline Timings</Text>
                <View style={styles.timingsCard}>
                  <View style={styles.timingRow}>
                    <Text style={styles.timingLabel}>1. Retrieval (Embedding + Similarity)</Text>
                    <Text style={styles.timingValue}>{timings.retrieval}ms</Text>
                  </View>
                  <View style={styles.timingRow}>
                    <Text style={styles.timingLabel}>2. Ranking (Top-K Selection)</Text>
                    <Text style={styles.timingValue}>{timings.ranking}ms</Text>
                  </View>
                  <View style={styles.timingRow}>
                    <Text style={styles.timingLabel}>3. Context Building</Text>
                    <Text style={styles.timingValue}>{timings.context}ms</Text>
                  </View>
                  <View style={styles.timingRow}>
                    <Text style={styles.timingLabel}>4. Summarization</Text>
                    <Text style={styles.timingValue}>{timings.summary}ms</Text>
                  </View>
                  <View style={[styles.timingRow, styles.totalRow]}>
                    <Text style={[styles.timingLabel, styles.totalLabel]}>Total Pipeline</Text>
                    <Text style={[styles.timingValue, styles.totalValue]}>{timings.total}ms</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Retrieved Notes with Similarity Scores */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Retrieved Notes ({results.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Query keywords: {Array.from(queryKeywords).join(', ') || 'none'}
              </Text>
              {results.map((result, index) => {
                const matchingKws = getMatchingKeywords(queryKeywords, result.note.text);
                const hasKeywordMatch = matchingKws.length > 0;
                
                return (
                  <TouchableOpacity
                    key={result.note.id}
                    style={[
                      styles.resultCard,
                      !hasKeywordMatch && styles.resultCardNoMatch
                    ]}
                    onPress={() => handleNotePress(result.note.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultHeader}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                      <View
                        style={[
                          styles.similarityBadge,
                          { backgroundColor: getSimilarityColor(result.similarity) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.similarityText,
                            { color: getSimilarityColor(result.similarity) },
                          ]}
                        >
                          {formatSimilarity(result.similarity)} hybrid score
                        </Text>
                      </View>
                    </View>
                    
                    {/* Keyword Match Indicator */}
                    <View style={styles.keywordRow}>
                      {hasKeywordMatch ? (
                        <Text style={styles.keywordMatchText}>
                          ✓ Keywords found: {matchingKws.join(', ')}
                        </Text>
                      ) : (
                        <Text style={styles.keywordNoMatchText}>
                          ✗ No keyword matches (semantic only)
                        </Text>
                      )}
                    </View>
                    
                    <Text style={styles.resultText} numberOfLines={3}>
                      {result.note.text}
                    </Text>
                    <Text style={styles.resultTimestamp}>
                      {new Date(result.note.timestamp).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Built Context */}
            {context && context.context && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Built Context</Text>
                <View style={styles.contextCard}>
                  <Text style={styles.contextLabel}>
                    Combined context from top {context.noteCount} notes:
                  </Text>
                  <Text style={styles.contextText}>{context.context}</Text>
                </View>
              </View>
            )}

            {/* Generated Summary */}
            {summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Generated Summary</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>{summary}</Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {!isSearching && results.length === 0 && query.trim() && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              No matching notes found for "{query}"
            </Text>
          </View>
        )}

        {!query.trim() && !isSearching && (
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionTitle}>How RAG Works:</Text>
            <Text style={styles.instructionText}>
              1. <Text style={styles.bold}>Embedding</Text>: Your query is converted to a vector
            </Text>
            <Text style={styles.instructionText}>
              2. <Text style={styles.bold}>Retrieval</Text>: Find similar notes using cosine similarity
            </Text>
            <Text style={styles.instructionText}>
              3. <Text style={styles.bold}>Ranking</Text>: Sort and select top-K most relevant
            </Text>
            <Text style={styles.instructionText}>
              4. <Text style={styles.bold}>Context Building</Text>: Extract key information
            </Text>
            <Text style={styles.instructionText}>
              5. <Text style={styles.bold}>Summarization</Text>: Generate a concise summary
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timingLabel: {
    fontSize: 14,
    color: '#666',
  },
  timingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  totalLabel: {
    fontWeight: '600',
    color: '#2196F3',
  },
  totalValue: {
    color: '#2196F3',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  similarityBadge: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  similarityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  contextCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
  },
  contextLabel: {
    fontSize: 12,
    color: '#e65100',
    marginBottom: 8,
    fontWeight: '500',
  },
  contextText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  instructionContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#2196F3',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  resultCardNoMatch: {
    backgroundColor: '#fff8f8',
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  keywordRow: {
    marginBottom: 8,
    paddingVertical: 4,
  },
  keywordMatchText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
  },
  keywordNoMatchText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '500',
  },
});
