import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function TruncatedName({ name, maxLength = 30, mobileMaxLength = 20, className = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [effectiveMax, setEffectiveMax] = useState(maxLength);
  const nameRef = useRef(null);
  const tooltipRef = useRef(null);

  // Determine truncation length based on screen width
  useEffect(() => {
    const updateMax = () => {
      setEffectiveMax(window.innerWidth < 768 ? mobileMaxLength : maxLength);
    };
    updateMax();
    window.addEventListener('resize', updateMax);
    return () => window.removeEventListener('resize', updateMax);
  }, [maxLength, mobileMaxLength]);

  const isTruncated = name.length > effectiveMax;

  const positionTooltip = useCallback(() => {
    if (!nameRef.current) return;
    const rect = nameRef.current.getBoundingClientRect();

    // Position below the name, left-aligned but clamped to viewport
    let left = rect.left;
    const maxTooltipWidth = Math.min(window.innerWidth - 24, 400);
    if (left + maxTooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - maxTooltipWidth - 12;
    }
    if (left < 12) left = 12;

    setTooltipStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      zIndex: 99999,
      maxWidth: maxTooltipWidth,
    });
  }, []);

  const handleClick = (e) => {
    if (!isTruncated) return;
    e.stopPropagation();
    e.preventDefault();
    if (!showTooltip) {
      positionTooltip();
    }
    setShowTooltip(!showTooltip);
  };

  // Close on outside tap/click
  useEffect(() => {
    if (!showTooltip) return;
    const handleOutside = (e) => {
      if (
        nameRef.current && !nameRef.current.contains(e.target) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target)
      ) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showTooltip]);

  // Close on scroll
  useEffect(() => {
    if (!showTooltip) return;
    const handleScroll = () => setShowTooltip(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showTooltip]);

  if (!isTruncated) {
    return <span className={className}>{name}</span>;
  }

  const tooltip = showTooltip
    ? createPortal(
        <div
          ref={tooltipRef}
          style={tooltipStyle}
          className="px-4 py-2.5 rounded-lg bg-gray-900 text-sm font-normal text-gray-100 shadow-xl border border-gray-600 break-words whitespace-normal"
        >
          {name}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span
        ref={nameRef}
        onClick={handleClick}
        onMouseEnter={() => {
          positionTooltip();
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${className} cursor-pointer`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {name.slice(0, effectiveMax)}…
      </span>
      {tooltip}
    </>
  );
}
