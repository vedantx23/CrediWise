import { createContext, useContext, useState, useMemo } from 'react';
import { creditCardsData } from '../data/mockData';

const CardContext = createContext();

export function CardProvider({ children }) {
  // Initialize with the first few cards from the mock dataset
  const [userCards, setUserCards] = useState(creditCardsData.slice(0, 3));
  
  const availableCards = creditCardsData;

  const addUserCard = (card) => {
    // Check if card is already added (optional)
    if (userCards.some(c => c.Card_Name === card.Card_Name)) {
      return;
    }
    setUserCards(prev => [...prev, card]);
  };

  const removeUserCard = (cardName) => {
    setUserCards(prev => prev.filter(c => c.Card_Name !== cardName));
  };

  const value = useMemo(() => ({
    userCards,
    availableCards,
    addUserCard,
    removeUserCard
  }), [userCards, availableCards]);

  return (
    <CardContext.Provider value={value}>
      {children}
    </CardContext.Provider>
  );
}

export function useCardContext() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('useCardContext must be used within a CardProvider');
  }
  return context;
}
