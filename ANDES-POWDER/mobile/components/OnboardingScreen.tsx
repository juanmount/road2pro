import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

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
    title: 'Pronósticos genéricos\nno funcionan en Patagonia',
    description: 'Los modelos meteorológicos estándar no consideran el cruce de tormentas del Pacífico ni el efecto de sombra de lluvia de los Andes.',
    color: '#64748b',
  },
  {
    id: '2',
    icon: 'analytics-outline',
    title: 'Algoritmos específicos\npara los Andes',
    description: 'Análisis de probabilidad de cruce de tormentas, ajustes por viento y elevación, e integración de ciclos ENSO (El Niño/La Niña).',
    color: '#0ea5e9',
  },
  {
    id: '3',
    icon: 'checkmark-circle-outline',
    title: 'Precisión sobre\noptimismo',
    description: 'Metodología conservadora basada en datos reales y validación continua de pronósticos.',
    color: '#10b981',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
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

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
          <Ionicons name={item.icon} size={80} color={item.color} />
        </View>
        
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <ImageBackground
      source={require('../assets/Background_home.jpeg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        {/* Skip Button */}
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          scrollEnabled={false}
        />

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Next/Done Button */}
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

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>ANDES POWDER</Text>
          <Text style={styles.logoSubtext}>Pronósticos científicos de nieve</Text>
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
    opacity: 0.3,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  slide: {
    width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#cbd5e1',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
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
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    letterSpacing: 1,
  },
});
