import React from 'react';
import TataWhitePaperModal from './TataWhitePaperModal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  t?: (key: string) => any;
}

export default function PrivacyPolicyModal({ isOpen, onClose, lang = 'id' }: PrivacyPolicyModalProps) {
  return (
    <TataWhitePaperModal
      isOpen={isOpen}
      onClose={onClose}
      lang={lang}
    />
  );
}
