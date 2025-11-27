import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { embedText } from '../embedding/embed';
import { saveNote } from '../db/notes';
import { logDebug, logError } from '../utils/logger';

type AddNoteScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddNote'
>;

interface Props {
  navigation: AddNoteScreenNavigationProp;
}

export default function AddNoteScreen({ navigation }: Props) {
  const [noteText, setNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!noteText.trim()) {
      Alert.alert('Error', 'Please enter some text for your note.');
      return;
    }

    setIsLoading(true);
    logDebug('Adding new note', { textLength: noteText.length });

    try {
      // On submit: embedText(text)
      const embedding = await embedText(noteText.trim());
      
      // Save to DB using saveNote()
      const noteId = await saveNote(noteText.trim(), embedding);
      
      logDebug('Note saved successfully', { noteId });
      
      Alert.alert('Success', 'Note saved successfully!', [
        {
          text: 'OK',
          // Navigate back to Home
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      logError('Failed to save note', error);
      Alert.alert(
        'Error',
        'Failed to save note. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Enter your note:</Text>
        
        <TextInput
          style={styles.textInput}
          placeholder="Type your note here..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={10}
          value={noteText}
          onChangeText={setNoteText}
          editable={!isLoading}
          textAlignVertical="top"
        />

        <Text style={styles.charCount}>
          {noteText.length} characters
        </Text>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!noteText.trim() || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!noteText.trim() || isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Save Note</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
