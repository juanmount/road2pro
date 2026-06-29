import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'thunderstorm-outline',
    title: 'La Patagonia juega\ncon sus propias reglas',
    description: 'Las tormentas vienen del Pacífico y los Andes distorsionan todo. Los modelos globales no tienen la resolución para los efectos locales de la montaña.',
    color: '#f59e0b',
  },
  {
    id: '2',
    icon: 'analytics-outline',
    title: 'Varios modelos,\nuna lectura limpia',
    description: 'Cruzamos los principales modelos meteorológicos globales, ajustados por elevación y viento. El número que ves ya está calibrado para la montaña.',
    color: '#0ea5e9',
  },
  {
    id: '3',
    icon: 'shield-checkmark-outline',
    title: 'Todo en\nun lugar',
    description: 'Pronóstico por elevación, condiciones en tiempo real, alertas de tormenta y cámaras en vivo para cada cerro.',
    color: '#10b981',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      onComplete();
    }
  };

  const slide = slides[currentIndex];

  return (
    <ImageBackground
      source={require('../assets/background_onboarding.jpeg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>

        {/* Top bar: Logo + Skip */}
        <View style={styles.topBar}>
          <Image
            source={require('../assets/Logo_horizontal.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          {currentIndex < slides.length - 1 && (
            <TouchableOpacity onPress={handleComplete}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slide content */}
        <View style={styles.slideArea}>
          <View style={[styles.iconContainer, { backgroundColor: `${slide.color}20` }]}>
            <Ionicons name={slide.icon} size={52} color={slide.color} />
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>

        {/* Bottom: dots + button */}
        <View style={styles.bottomArea}>
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentIndex ? styles.activeDot : styles.inactiveDot]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
            </Text>
            <Ionicons
              name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color="#fff"
              style={styles.nextButtonIcon}
            />
          </TouchableOpacity>
        </View>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.10)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  slideArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: '55%',
  },
  bottomArea: {
    paddingBottom: 80,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cbd5e1',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#0ea5e9',
    width: 24,
  },
  inactiveDot: {
    backgroundColor: '#475569',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    marginHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
  logoImage: {
    width: 130,
    height: 32,
  },
});
