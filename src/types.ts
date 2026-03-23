export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  dailyGoal: number;
  streak: number;
  lastAttemptedAt: any;
  totalQuestions: number;
  correctQuestions: number;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  chapter: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  createdAt: any;
}

export interface UserProgress {
  id: string;
  userId: string;
  questionId: string;
  isCorrect: boolean;
  attemptedAt: any;
  chapter: string;
}

export interface Mistake {
  id: string;
  userId: string;
  questionId: string;
  attemptedAt: any;
}

export const CHAPTERS = [
  "The Living World",
  "Biological Classification",
  "Plant Kingdom",
  "Animal Kingdom",
  "Morphology of Flowering Plants",
  "Anatomy of Flowering Plants",
  "Structural Organisation in Animals",
  "Cell: The Unit of Life",
  "Biomolecules",
  "Cell Cycle and Cell Division",
  "Transport in Plants",
  "Mineral Nutrition",
  "Photosynthesis in Higher Plants",
  "Respiration in Plants",
  "Plant Growth and Development",
  "Digestion and Absorption",
  "Breathing and Exchange of Gases",
  "Body Fluids and Circulation",
  "Excretory Products and Their Elimination",
  "Locomotion and Movement",
  "Neural Control and Coordination",
  "Chemical Coordination and Integration",
  "Reproduction in Organisms",
  "Sexual Reproduction in Flowering Plants",
  "Human Reproduction",
  "Reproductive Health",
  "Principles of Inheritance and Variation",
  "Molecular Basis of Inheritance",
  "Evolution",
  "Human Health and Disease",
  "Strategies for Enhancement in Food Production",
  "Microbes in Human Welfare",
  "Biotechnology: Principles and Processes",
  "Biotechnology and Its Applications",
  "Organisms and Populations",
  "Ecosystem",
  "Biodiversity and Conservation",
  "Environmental Issues"
];
