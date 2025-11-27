import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { retrieveNotes } from '../rag/retrieve';
import { topK } from '../rag/rank';
import { buildContext } from '../rag/contextBuilder';
import { summarize } from '../rag/summarizer';
import { getAllNotes } from '../db/notes';
import { RetrievalResult, BuiltContext, Note } from '../utils/types';
import { logDebug, createTimer } from '../utils/logger';
import RetrievalResultComponent from '../components/RetrievalResult';
import NoteItem from '../components/NoteItem';

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;

interface Props {
  navigation: SearchScreenNavigationProp;
}

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [context, setContext] = useState<BuiltContext | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [showAllNotes, setShowAllNotes] = useState(true);

  // Load all notes on mount
  useEffect(() => {
    loadAllNotes();
  }, []);

  const loadAllNotes = async () => {
    try {
      const notes = await getAllNotes();
      setAllNotes(notes);
    } catch (error) {
      logDebug('Failed to load notes', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setShowAllNotes(true);
      setResults([]);
      setContext(null);
      setSummary('');
      return;
    }

    setIsSearching(true);
    setShowAllNotes(false);
    const timer = createTimer('Full search pipeline');

    try {
      // Call retrieve.ts to get ranked notes
      const retrievedResults = await retrieveNotes(query.trim());

      // Use rank.ts for final top-k
      const topResults = topK(retrievedResults, 5);
      setResults(topResults);

      if (topResults.length > 0) {
        // Build context using contextBuilder.ts
        const builtContext = buildContext(topResults, 3);
        setContext(builtContext);

        // Summarize using summarizer.ts
        const summaryText = summarize(builtContext.context, 3);
        setSummary(summaryText);
      } else {
        setContext(null);
        setSummary('');
      }

      timer.stop();
    } catch (error) {
      logDebug('Search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNotePress = (noteId: number) => {
    navigation.navigate('ViewNote', { noteId });
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <NoteItem
      note={item}
      onPress={() => handleNotePress(item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search your notes semantically..."
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
            <Text style={styles.searchButtonText}>🔍</Text>
          )}
        </TouchableOpacity>
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {!isSearching && showAllNotes && (
        <View style={styles.allNotesContainer}>
          <Text style={styles.sectionTitle}>All Notes ({allNotes.length})</Text>
          {allNotes.length === 0 ? (
            <Text style={styles.emptyText}>
              No notes yet. Add your first note!
            </Text>
          ) : (
            <FlatList
              data={allNotes}
              renderItem={renderNoteItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}

      {!isSearching && !showAllNotes && results.length > 0 && (
        <RetrievalResultComponent
          results={results}
          context={context}
          summary={summary}
          onNotePress={handleNotePress}
        />
      )}

      {!isSearching && !showAllNotes && results.length === 0 && query.trim() && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            No matching notes found for "{query}"
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: '#6200ee',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  allNotesContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
