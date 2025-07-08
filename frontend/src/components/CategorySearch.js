import React, { useState, useRef, useEffect } from 'react';
import './CategorySearch.css';
import Spinner from './icons/Spinner';

const CategorySearch = ({
  value,
  onChange,
  placeholder,
  disabled,
  results,
  onSelect,
  isLoading,
  renderResultItem,
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

  const showResults = isFocused && (results.length > 0 || isLoading);

  return (
    <div className="category-search-container" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
      />
      {showResults && (
        <div className="category-results">
          {isLoading ? <div className="category-loading"><Spinner /></div> :
            results.map((item) => (
              <div key={item.id} className="category-result-item" onMouseDown={() => onSelect(item)}>
                {renderResultItem(item)}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default CategorySearch;