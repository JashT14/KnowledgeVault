import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { retrieveNotesStrict } from '../rag/retrieve';
import { getAllNotes } from '../db/notes';
import { Note } from '../utils/types';
import { logDebug } from '../utils/logger';
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
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Animations
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  // Load all notes on mount
  useEffect(() => {
    loadAllNotes();
    
    // Animate search bar
    Animated.timing(searchBarAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animate list when notes change
  useEffect(() => {
    if (!isInitialLoad) {
      listAnim.setValue(0);
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [allNotes, searchResults, isInitialLoad]);

  // Real-time search as user types
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // If query is empty, show all notes
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce search by 150ms for smooth typing
    debounceTimer.current = setTimeout(() => {
      performSearch(query.trim());
    }, 150);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const loadAllNotes = async () => {
    try {
      const notes = await getAllNotes();
      setAllNotes(notes);
      setIsInitialLoad(false);
    } catch (error) {
      logDebug('Failed to load notes', error);
      setIsInitialLoad(false);
    }
  };

  const performSearch = async (searchQuery: string) => {
    try {
      const retrievedResults = await retrieveNotesStrict(searchQuery, 0.15);
      const matchedNotes = retrievedResults.slice(0, 10).map(r => r.note);
      setSearchResults(matchedNotes);
    } catch (error) {
      logDebug('Search failed', error);
    }
  };

  const handleNotePress = (noteId: number) => {
    navigation.navigate('ViewNote', { noteId });
  };

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => (
    <Animated.View
      style={{
        opacity: listAnim,
        transform: [{
          translateY: listAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        }],
      }}
    >
      <NoteItem
        note={item}
        onPress={() => handleNotePress(item.id)}
      />
    </Animated.View>
  );

  const displayNotes = query.trim() ? searchResults : allNotes;
  const showNoResults = query.trim() && searchResults.length === 0 && !isInitialLoad;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchBarAnim,
            transform: [{
              translateY: searchBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          },
        ]}
      >
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          autoFocus={false}
        />
      </Animated.View>

      {!isInitialLoad && displayNotes.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>
            {query.trim() 
              ? `Found ${searchResults.length} note${searchResults.length !== 1 ? 's' : ''}`
              : `All Notes (${allNotes.length})`
            }
          </Text>
          <FlatList
            data={displayNotes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {!isInitialLoad && !query.trim() && allNotes.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notes yet. Add your first note!</Text>
        </View>
      )}

      {showNoResults && (
        <Animated.View style={[styles.noResultsContainer, { opacity: listAnim }]}>
          <Text style={styles.noResultsText}>
            No matching notes found for "{query}"
          </Text>
        </Animated.View>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
