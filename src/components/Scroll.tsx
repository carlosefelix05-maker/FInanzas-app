import { createContext, useContext, type RefObject } from 'react';

export const ScrollCtx = createContext<RefObject<HTMLElement | null>>({ current: null });
export const useScroll = () => useContext(ScrollCtx);
