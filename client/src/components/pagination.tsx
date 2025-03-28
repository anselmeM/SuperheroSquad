import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Display a maximum of 5 page numbers, centered around the current page
  const maxPageButtons = 5;
  const pageNumbers: number[] = [];
  
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  // Adjust startPage if endPage is at its maximum
  if (endPage === totalPages) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  if (totalPages <= 1) {
    return null; // Don't show pagination if there's only one page
  }
  
  return (
    <div className="flex items-center justify-center space-x-2 my-8 animate-in fade-in duration-300">
      {/* First page button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
        className="h-8 w-8 transition-all duration-200 hover:scale-110"
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      
      {/* Previous page button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-8 w-8 transition-all duration-200 hover:scale-110"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page number buttons */}
      <div className="flex space-x-1">
        {startPage > 1 && (
          <>
            <Button
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(1)}
              className="h-8 w-8 font-major tracking-wide transition-all duration-200 hover:scale-110"
            >
              1
            </Button>
            {startPage > 2 && (
              <div className="flex items-center justify-center w-8">
                <span className="text-muted-foreground font-major">...</span>
              </div>
            )}
          </>
        )}
        
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={`h-8 w-8 font-major tracking-wide transition-all duration-200 hover:scale-110 ${
              currentPage === page ? "bg-primary text-primary-foreground shadow-md" : ""
            }`}
          >
            {page}
          </Button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <div className="flex items-center justify-center w-8">
                <span className="text-muted-foreground font-major">...</span>
              </div>
            )}
            <Button
              variant={currentPage === totalPages ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(totalPages)}
              className="h-8 w-8 font-major tracking-wide transition-all duration-200 hover:scale-110"
            >
              {totalPages}
            </Button>
          </>
        )}
      </div>
      
      {/* Next page button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-8 w-8 transition-all duration-200 hover:scale-110"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      {/* Last page button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        className="h-8 w-8 transition-all duration-200 hover:scale-110"
        aria-label="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}