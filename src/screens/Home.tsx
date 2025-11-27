import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    // Title fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
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

    // Staggered button animations
    const buttonAnimations = buttonAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 200 + index * 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, buttonAnimations).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>Knowledge Vault</Text>
          <Text style={styles.subtitle}>
            Your personal semantic note-taking app
          </Text>
        </Animated.View>

        <View style={styles.buttonContainer}>
          <Animated.View style={{ opacity: buttonAnims[0], transform: [{ scale: buttonAnims[0] }] }}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('AddNote')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Add Note</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: buttonAnims[1], transform: [{ scale: buttonAnims[1] }] }}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Search Notes</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: buttonAnims[2], transform: [{ scale: buttonAnims[2] }] }}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                View All Notes
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: buttonAnims[3], transform: [{ scale: buttonAnims[3] }] }}>
            <TouchableOpacity
              style={[styles.button, styles.demoButton]}
              onPress={() => navigation.navigate('RAGDemo')}
              activeOpacity={0.8}
            >
              <Text style={styles.demoButtonText}>RAG Demo</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  secondaryButtonText: {
    color: '#2196F3',
  },
  demoButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
    borderRadius: 8,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
