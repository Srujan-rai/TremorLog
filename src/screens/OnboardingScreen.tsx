import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { setOnboardingComplete } from '../services/storage';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: 'What is tremor?',
    body: 'Tremor is an involuntary shaking of a body part. This app helps you track hand tremor over time so you can share meaningful data with your doctor.',
  },
  {
    title: 'How to hold your phone',
    body: 'Hold your phone flat on your palm with your right or left hand. Slightly bend your elbow. Sit down and rest your elbow on an armrest if possible. Stay relaxed.',
  },
  {
    title: 'What your score means',
    body: '80–100: Very stable\n60–79: Some tremor detected\n40–59: Moderate tremor — track closely\n0–39: Significant tremor — show your doctor',
  },
];

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleNext() {
    if (isLast) {
      await setOnboardingComplete();
      onComplete();
    } else {
      setStep(step + 1);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.stepIndicator}>
        {step + 1} / {STEPS.length}
      </Text>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.body}>{current.body}</Text>
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepIndicator: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a5276',
    marginBottom: 24,
  },
  body: {
    fontSize: 20,
    lineHeight: 32,
    color: '#333',
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#2e86c1',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
