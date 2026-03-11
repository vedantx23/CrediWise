import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { creditCardsData } from '../data/mockData';
import api from '../api';
import { useAuth } from './AuthContext';

const CardContext = createContext();

export function CardProvider({ children }) {
  const { user } = useAuth();
  const [userCards, setUserCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const availableCards = creditCardsData;

  // Fetch user's saved cards from backend on mount / when user changes
  useEffect(() => {
    if (!user) {
      setUserCards([]);
      return;
    }

    const fetchUserCards = async () => {
      setLoading(true);
      try {
        const res = await api.get('/instruments');
        const instruments = res.data.instruments || [];

        // Map backend instruments back to the rich card catalog data
        const enrichedCards = instruments.map(instrument => {
          const catalogCard = creditCardsData.find(
            c => c.Card_Name === instrument.name
          );
          // If found in catalog, merge with the instrument id for later deletion
          if (catalogCard) {
            return { ...catalogCard, _instrumentId: instrument.id };
          }
          // If not in catalog (e.g. custom instrument), build a minimal card object
          return {
            Card_Name: instrument.name,
            Bank: instrument.type || 'Other',
            Annual_Fee_INR: 0,
            Reward_Rate: `${instrument.base_reward_rate}x`,
            Reward_Type: 'Points',
            Reward_Value_Per_Point_INR: instrument.redemption_value || 0.25,
            Lounge_Access: 'N/A',
            International_Usage: 'N/A',
            Milestone_Reward: 'N/A',
            Spend_Based_Fee_Waiver: 'N/A',
            Third_Party_Tieups: '',
            _instrumentId: instrument.id
          };
        });

        setUserCards(enrichedCards);
      } catch (err) {
        console.error('Failed to fetch user cards:', err);
        // On error, keep whatever is in state (might be empty on first load)
      } finally {
        setLoading(false);
      }
    };

    fetchUserCards();
  }, [user]);

  const addUserCard = useCallback(async (card) => {
    // Prevent duplicates
    if (userCards.some(c => c.Card_Name === card.Card_Name)) {
      return;
    }

    try {
      // POST to backend to persist
      const res = await api.post('/instruments', {
        name: card.Card_Name,
        type: 'credit_card',
        base_reward_rate: card.Reward_Value_Per_Point_INR || 1.0,
        redemption_value: card.Reward_Value_Per_Point_INR || 0.25,
      });

      const instrument = res.data.instrument;

      // Add enriched card to state
      setUserCards(prev => [...prev, { ...card, _instrumentId: instrument.id }]);
    } catch (err) {
      console.error('Failed to add card:', err);
      throw err; // Let the caller handle the error (e.g. show toast)
    }
  }, [userCards]);

  const removeUserCard = useCallback(async (cardName) => {
    const card = userCards.find(c => c.Card_Name === cardName);
    if (!card || !card._instrumentId) {
      // Fallback: just remove from local state
      setUserCards(prev => prev.filter(c => c.Card_Name !== cardName));
      return;
    }

    try {
      await api.delete(`/instruments/${card._instrumentId}`);
      setUserCards(prev => prev.filter(c => c.Card_Name !== cardName));
    } catch (err) {
      console.error('Failed to remove card:', err);
      throw err;
    }
  }, [userCards]);

  const value = useMemo(() => ({
    userCards,
    availableCards,
    addUserCard,
    removeUserCard,
    loading
  }), [userCards, availableCards, addUserCard, removeUserCard, loading]);

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
