import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/Home';
import AddNoteScreen from './src/screens/AddNote';
import SearchScreen from './src/screens/Search';
import ViewNoteScreen from './src/screens/ViewNote';
import RAGDemoScreen from './src/screens/RAGDemo';
import { initDatabase } from './src/db/notes';

export type RootStackParamList = {
  Home: undefined;
  AddNote: undefined;
  Search: undefined;
  ViewNote: { noteId: number };
  RAGDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    initDatabase();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Knowledge Vault' }}
        />
        <Stack.Screen
          name="AddNote"
          component={AddNoteScreen}
          options={{ title: 'Add Note' }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: 'Search Notes' }}
        />
        <Stack.Screen
          name="ViewNote"
          component={ViewNoteScreen}
          options={{ title: 'View Note' }}
        />
        <Stack.Screen
          name="RAGDemo"
          component={RAGDemoScreen}
          options={{ title: 'RAG Demo' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
