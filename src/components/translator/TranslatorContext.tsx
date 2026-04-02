import { createContext, useContext } from 'react';

// Define the full state interface later as needed; using any temporarily to ease migration
export const TranslatorContext = createContext<any>(null);

export function useTranslator() {
  const context = useContext(TranslatorContext);
  if (!context) {
    throw new Error('useTranslator must be used within TranslatorProvider (TranslatorStudioApp)');
  }
  return context;
}
