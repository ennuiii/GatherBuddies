/**
 * Avatar Editor Modal
 *
 * Full avatar customization UI with live preview.
 * Tabs for Body, Hair, Clothing, and Accessories.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Scissors, Shirt, Sparkles, Shuffle } from 'lucide-react';
import type { AvatarConfig, BodyType, SkinTone, HairStyle, ClothingTop, ClothingBottom, Shoes, AccessoryType } from '../../types/avatar';
import AvatarPreview from './AvatarPreview';
import {
  DEFAULT_AVATAR_CONFIG,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  CLOTHING_TOPS,
  CLOTHING_BOTTOMS,
  SHOES_OPTIONS,
  CLOTHING_COLORS,
  ACCESSORIES,
  generateRandomAvatar,
} from '../../types/avatar';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
}

type EditorTab = 'body' | 'hair' | 'clothing' | 'accessories';

const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: 'masculine', label: 'Masculine' },
  { id: 'feminine', label: 'Feminine' },
  { id: 'neutral', label: 'Neutral' },
];

const AvatarEditor: React.FC<AvatarEditorProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}) => {
  const [config, setConfig] = useState<AvatarConfig>(currentConfig);
  const [activeTab, setActiveTab] = useState<EditorTab>('body');

  // Reset config when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfig(currentConfig);
    }
  }, [isOpen, currentConfig]);

  // Update body settings
  const updateBody = useCallback((updates: Partial<AvatarConfig['body']>) => {
    setConfig(prev => ({
      ...prev,
      body: { ...prev.body, ...updates },
    }));
  }, []);

  // Update hair settings
  const updateHair = useCallback((updates: Partial<AvatarConfig['hair']>) => {
    setConfig(prev => ({
      ...prev,
      hair: { ...prev.hair, ...updates },
    }));
  }, []);

  // Update clothing settings
  const updateClothing = useCallback((updates: Partial<AvatarConfig['clothing']>) => {
    setConfig(prev => ({
      ...prev,
      clothing: { ...prev.clothing, ...updates },
    }));
  }, []);

  // Toggle accessory
  const toggleAccessory = useCallback((accessoryType: AccessoryType) => {
    setConfig(prev => {
      const hasAccessory = prev.accessories.some(a => a.type === accessoryType);

      if (hasAccessory) {
        return {
          ...prev,
          accessories: prev.accessories.filter(a => a.type !== accessoryType),
        };
      } else {
        return {
          ...prev,
          accessories: [...prev.accessories, { type: accessoryType }],
        };
      }
    });
  }, []);

  // Randomize avatar
  const handleRandomize = useCallback(() => {
    const random = generateRandomAvatar();
    setConfig(prev => ({
      ...random,
      id: prev.id, // Keep existing ID
    }));
  }, []);

  // Reset to default
  const handleReset = useCallback(() => {
    setConfig(prev => ({
      ...DEFAULT_AVATAR_CONFIG,
      id: prev.id,
      createdAt: prev.createdAt,
    }));
  }, []);

  // Save and close
  const handleSave = useCallback(() => {
    onSave({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  }, [config, onSave, onClose]);

  const tabs = [
    { id: 'body' as const, label: 'Body', icon: User },
    { id: 'hair' as const, label: 'Hair', icon: Scissors },
    { id: 'clothing' as const, label: 'Clothing', icon: Shirt },
    { id: 'accessories' as const, label: 'Accessories', icon: Sparkles },
  ];

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="avatar-editor-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="avatar-editor-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="avatar-editor-header">
            <h2 className="avatar-editor-title">Customize Your Avatar</h2>
            <button
              onClick={onClose}
              className="avatar-editor-close"
              aria-label="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content */}
          <div className="avatar-editor-body">
            {/* Preview Panel */}
            <div className="avatar-editor-preview">
              <div className="avatar-preview-box">
                <AvatarPreview config={config} size={128} animate={true} />
              </div>
              <div className="avatar-preview-actions">
                <button
                  onClick={handleRandomize}
                  className="avatar-btn avatar-btn-secondary"
                >
                  <Shuffle className="w-4 h-4" />
                  Randomize
                </button>
                <button
                  onClick={handleReset}
                  className="avatar-btn avatar-btn-ghost"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Editor Panel */}
            <div className="avatar-editor-panel">
              {/* Tabs */}
              <div className="avatar-editor-tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`avatar-editor-tab ${activeTab === tab.id ? 'active' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="avatar-editor-content">
                {/* Body Tab */}
                {activeTab === 'body' && (
                  <div className="avatar-options">
                    {/* Body Type */}
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Body Type</label>
                      <div className="avatar-option-buttons">
                        {BODY_TYPES.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => updateBody({ type: type.id })}
                            className={`avatar-option-btn ${config.body.type === type.id ? 'selected' : ''}`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Skin Tone */}
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Skin Tone</label>
                      <div className="avatar-color-swatches">
                        {SKIN_TONES.map((tone) => (
                          <button
                            key={tone.id}
                            onClick={() => updateBody({ skinTone: tone.id })}
                            className={`avatar-color-swatch ${config.body.skinTone === tone.id ? 'selected' : ''}`}
                            style={{ backgroundColor: tone.hex }}
                            title={tone.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hair Tab */}
                {activeTab === 'hair' && (
                  <div className="avatar-options">
                    {/* Hair Style */}
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Style</label>
                      <div className="avatar-style-grid">
                        {HAIR_STYLES.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => updateHair({ style: style.id })}
                            className={`avatar-style-btn ${config.hair.style === style.id ? 'selected' : ''}`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hair Color */}
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Color</label>
                      <div className="avatar-color-swatches">
                        {HAIR_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateHair({ color })}
                            className={`avatar-color-swatch ${config.hair.color === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Clothing Tab */}
                {activeTab === 'clothing' && (
                  <div className="avatar-options">
                    {/* Top */}
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Top</label>
                      <div className="avatar-style-grid">
                        {CLOTHING_TOPS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => updateClothing({ top: item.id })}
                            className={`avatar-style-btn ${config.clothing.top === item.id ? 'selected' : ''}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="avatar-color-swatches">
                        {CLOTHING_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateClothing({ topColor: color })}
                            className={`avatar-color-swatch small ${config.clothing.topColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bottom */}
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Bottom</label>
                      <div className="avatar-style-grid">
                        {CLOTHING_BOTTOMS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => updateClothing({ bottom: item.id })}
                            className={`avatar-style-btn ${config.clothing.bottom === item.id ? 'selected' : ''}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="avatar-color-swatches">
                        {CLOTHING_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateClothing({ bottomColor: color })}
                            className={`avatar-color-swatch small ${config.clothing.bottomColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Shoes */}
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Shoes</label>
                      <div className="avatar-style-grid">
                        {SHOES_OPTIONS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => updateClothing({ shoes: item.id })}
                            className={`avatar-style-btn ${config.clothing.shoes === item.id ? 'selected' : ''}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="avatar-color-swatches">
                        {CLOTHING_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateClothing({ shoesColor: color })}
                            className={`avatar-color-swatch small ${config.clothing.shoesColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Accessories Tab */}
                {activeTab === 'accessories' && (
                  <div className="avatar-options">
                    <div className="avatar-option-group">
                      <label className="avatar-option-label">Select Accessories</label>
                      <p className="avatar-option-hint">Click to toggle on/off</p>
                      <div className="avatar-accessory-grid">
                        {ACCESSORIES.map((acc) => (
                          <button
                            key={acc.id}
                            onClick={() => toggleAccessory(acc.id)}
                            className={`avatar-accessory-btn ${config.accessories.some(a => a.type === acc.id) ? 'selected' : ''}`}
                          >
                            {acc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="avatar-editor-footer">
            <button onClick={onClose} className="avatar-btn avatar-btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="avatar-btn avatar-btn-primary">
              Save Avatar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default AvatarEditor;
