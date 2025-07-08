import React, { useState, useRef, useEffect } from 'react';
import './TagInput.css';

const TagInput = ({
  tags,
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  onRemoveTag,
  suggestions,
  onAddTag,
  disabled,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div className="tag-input-container" ref={containerRef} onFocus={() => setIsFocused(true)}>
      <div className="tag-list">
        {tags.map(tag => ( // Now expects an array of objects
          <div key={tag.tag_id} className="tag-item">
            {tag.localization_names['en-us']}
            <button type="button" className="tag-remove-btn" onClick={() => onRemoveTag(tag)}>&times;</button>
          </div>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={onTagInputChange}
          onKeyDown={onTagInputKeyDown}
          placeholder={tags.length < 10 ? "Search for a tag..." : "Max 10 tags"}
          disabled={disabled || tags.length >= 10}
          className="tag-input-field"
        />
      </div>
      {showSuggestions && (
        <div className="tag-suggestions">
          {suggestions.map(suggestion => ( // Now expects an array of objects
            <div key={suggestion.tag_id} className="suggestion-item" onMouseDown={() => onAddTag(suggestion)}>
              {suggestion.localization_names['en-us']}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;