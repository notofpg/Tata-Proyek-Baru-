import React from 'react';
import TataWhitePaperModal from './TataWhitePaperModal';

interface UpdateNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  t?: (key: string) => any;
}

export default function UpdateNotesModal({ isOpen, onClose, lang = 'id' }: UpdateNotesModalProps) {
  return (
    <TataWhitePaperModal
      isOpen={isOpen}
      onClose={onClose}
      lang={lang}
      initialSection="about"
    />
  );
}
