import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    if (currentPage - half < 1) {
      end = Math.min(totalPages, maxPagesToShow);
    }

    if (currentPage + half > totalPages) {
      start = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    if (start > 1) {
      pageNumbers.push(<PageButton key={1} page={1} onClick={handlePageClick} />);
      if (start > 2) {
        pageNumbers.push(<span key="start-ellipsis" className="px-4 py-2">...</span>);
      }
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(
        <PageButton
          key={i}
          page={i}
          isCurrent={currentPage === i}
          onClick={handlePageClick}
        />
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pageNumbers.push(<span key="end-ellipsis" className="px-4 py-2">...</span>);
      }
      pageNumbers.push(<PageButton key={totalPages} page={totalPages} onClick={handlePageClick} />);
    }

    return pageNumbers;
  };

  return (
    <nav className="flex items-center justify-center space-x-2 p-4">
      <NavButton 
        onClick={() => handlePageClick(currentPage - 1)} 
        disabled={currentPage === 1}
      >
        <FiChevronLeft className="h-5 w-5" />
        <span>Trước</span>
      </NavButton>
      
      <div className="hidden md:flex items-center space-x-1">
        {renderPageNumbers()}
      </div>

      <NavButton 
        onClick={() => handlePageClick(currentPage + 1)} 
        disabled={currentPage === totalPages}
      >
        <span>Sau</span>
        <FiChevronRight className="h-5 w-5" />
      </NavButton>
    </nav>
  );
};

const PageButton: React.FC<{ page: number; isCurrent?: boolean; onClick: (page: number) => void; }> = ({ page, isCurrent, onClick }) => (
  <button
    onClick={() => onClick(page)}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
      isCurrent
        ? 'bg-blue-600 text-white shadow-md'
        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
    }`}
  >
    {page}
  </button>
);

const NavButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
  >
    {children}
  </button>
);

export default Pagination;
