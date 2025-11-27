import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { RetrievalResult as RetrievalResultType, BuiltContext } from '../utils/types';

interface Props {
  results: RetrievalResultType[];
  context: BuiltContext | null;
  summary: string;
  onNotePress: (noteId: number) => void;
}

/**
 * Display ranked results + summary from RAG pipeline
 */
export default function RetrievalResult({
  results,
  context,
  summary,
  onNotePress,
}: Props) {
  const formatSimilarity = (sim: number): string => {
    return `${Math.round(sim * 100)}%`;
  };

  const getSimilarityColor = (sim: number): string => {
    if (sim >= 0.7) return '#4caf50';
    if (sim >= 0.5) return '#ff9800';
    return '#f44336';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Show summary from summarizer.ts */}
      {summary && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>📝 Summary</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        </View>
      )}

      {/* Show context built from contextBuilder.ts */}
      {context && context.context && (
        <View style={styles.contextSection}>
          <Text style={styles.sectionTitle}>📚 Context</Text>
          <View style={styles.contextCard}>
            <Text style={styles.contextText}>{context.context}</Text>
          </View>
        </View>
      )}

      {/* Show list of notes with similarity scores */}
      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>
          🔍 Matching Notes ({results.length})
        </Text>
        
        {results.map((result, index) => (
          <TouchableOpacity
            key={result.note.id}
            style={styles.resultCard}
            onPress={() => onNotePress(result.note.id)}
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
                  {formatSimilarity(result.similarity)} match
                </Text>
              </View>
            </View>

            <Text style={styles.resultText} numberOfLines={4}>
              {result.note.text}
            </Text>

            <Text style={styles.resultTimestamp}>
              {new Date(result.note.timestamp).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summarySection: {
    padding: 16,
    paddingBottom: 0,
  },
  contextSection: {
    padding: 16,
    paddingBottom: 0,
  },
  resultsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2e7d32',
  },
  contextCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  contextText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#e65100',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rankBadge: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  similarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  similarityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 8,
  },
  resultTimestamp: {
    fontSize: 12,
    color: '#999',
  },
});
