import React from 'react';
import {AbsoluteFill} from 'remotion';
import {TEXT_GROUPS} from '../config';
import {BlobBackground} from '../components/BlobBackground';
import {TextGroup} from '../components/TextGroup';

// Cena 1 (fundo claro): [Amanhã,] / a partir das [8 horas].
// O bloco sai enquanto a onda (cena 2) sobe.
export const Scene1Intro: React.FC = () => (
  <AbsoluteFill>
    <BlobBackground variant="light" seed="s1" />
    <TextGroup group={TEXT_GROUPS.horario} theme="light" />
  </AbsoluteFill>
);
