import React from 'react';
import './TagInput.css';

const TagInput = ({
  tags,
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  onRemoveTag,
  disabled,
}) => {
  return (
    <div className="tag-input-container">
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
    </div>
  );
};

export default TagInput;