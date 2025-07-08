import React, { useState, useRef, useEffect } from 'react';
import './TagInput.css';
import Spinner from './icons/Spinner';

const TagInput = ({
  tags,
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
  suggestions,
  isTagSearchLoading,
  disabled,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);

  // Effect to handle clicks outside the component to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The dropdown should show if the input is focused and the user has started typing.
  // This prevents it from hiding immediately if no results are found.
  const showSuggestions = isFocused && tagInput.length > 0;

  return (
    <div
      className="tag-input-container"
      ref={containerRef}
      onFocus={() => setIsFocused(true)}
    >
      <div className="tag-list">
        {tags.map(tag => (
          <div key={tag} className="tag-item">
            {tag}
            <button type="button" className="tag-remove-btn" onClick={() => onRemoveTag(tag)}>&times;</button>
          </div>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={onTagInputChange}
          onKeyDown={onTagInputKeyDown}
          placeholder={tags.length < 10 ? "Add a tag..." : "Max 10 tags"}
          disabled={disabled || tags.length >= 10}
          className="tag-input-field"
        />
      </div>
      {showSuggestions && (
        <div className="tag-suggestions">
          {isTagSearchLoading ? (
            <div className="suggestion-loading"><Spinner /></div>
          ) : suggestions.length > 0 ? (
            suggestions.map(suggestion => (
              <div key={suggestion} className="suggestion-item" onMouseDown={() => onAddTag(suggestion)}>
                {suggestion}
              </div>
            ))
          ) : (
            <div className="suggestion-item-none">No matching tags found. Press Enter to add.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagInput;