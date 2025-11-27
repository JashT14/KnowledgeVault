import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { getNoteById, deleteNote } from '../db/notes';
import { Note } from '../utils/types';
import { logDebug, logError } from '../utils/logger';

type ViewNoteScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ViewNote'
>;

type ViewNoteScreenRouteProp = RouteProp<RootStackParamList, 'ViewNote'>;

interface Props {
  navigation: ViewNoteScreenNavigationProp;
  route: ViewNoteScreenRouteProp;
}

export default function ViewNoteScreen({ navigation, route }: Props) {
  const { noteId } = route.params;
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadNote();
  }, [noteId]);

  const loadNote = async () => {
    try {
      // Load note by ID
      const loadedNote = await getNoteById(noteId);
      setNote(loadedNote);
      logDebug('Note loaded', { noteId });
    } catch (error) {
      logError('Failed to load note', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNote(noteId);
      logDebug('Note deleted', { noteId });
      navigation.goBack();
    } catch (error) {
      logError('Failed to delete note', error);
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading note...</Text>
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Note not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Show timestamp */}
        <View style={styles.metaContainer}>
          <Text style={styles.timestamp}>
            📅 {formatTimestamp(note.timestamp)}
          </Text>
          <Text style={styles.noteId}>ID: {note.id}</Text>
        </View>

        {/* Show full text */}
        <View style={styles.textContainer}>
          <Text style={styles.noteText}>{note.text}</Text>
        </View>

        {/* Embedding info */}
        <View style={styles.embeddingInfo}>
          <Text style={styles.embeddingLabel}>
            🧠 Embedding: {note.embedding.length} dimensions
          </Text>
        </View>

        {/* Delete button (optional) */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.deleteButtonText}>🗑️ Delete Note</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  noteId: {
    fontSize: 12,
    color: '#999',
  },
  textContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  embeddingInfo: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  embeddingLabel: {
    fontSize: 14,
    color: '#2e7d32',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
