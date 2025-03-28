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
    <div className="flex flex-col items-center justify-center space-y-4 my-8 animate-in fade-in duration-300">
      <div className="bg-primary/5 backdrop-blur-md rounded-full px-6 py-3 border border-primary/20 shadow-lg flex items-center justify-center space-x-3 hover:shadow-xl transition-all duration-300">
        {/* First page button */}
        <Button
          variant={currentPage === 1 ? "ghost" : "outline"}
          size="icon"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          className="h-9 w-9 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:bg-primary/10 disabled:opacity-50"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        {/* Previous page button */}
        <Button
          variant={currentPage === 1 ? "ghost" : "outline"}
          size="icon"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-9 w-9 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:bg-primary/10 disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Page number buttons */}
        <div className="flex space-x-2 px-2">
          {startPage > 1 && (
            <>
              <Button
                variant={currentPage === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(1)}
                className="h-9 w-9 rounded-full font-major tracking-wide transition-all duration-300 hover:scale-110 hover:shadow-lg hover:bg-primary/20 hover:border-primary/50"
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
              className={`
                h-9 w-9 
                rounded-full 
                font-major 
                tracking-wide 
                transition-all 
                duration-300 
                hover:scale-110 
                hover:shadow-lg
                hover:bg-primary/20 
                hover:border-primary/50
                ${currentPage === page ? 
                  "bg-primary text-primary-foreground shadow-md transform scale-110" : 
                  "bg-background"}
              `}
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
                className="h-9 w-9 rounded-full font-major tracking-wide transition-all duration-300 hover:scale-110 hover:shadow-lg hover:bg-primary/20 hover:border-primary/50"
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>
        
        {/* Next page button */}
        <Button
          variant={currentPage === totalPages ? "ghost" : "outline"}
          size="icon"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-9 w-9 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:bg-primary/10 disabled:opacity-50"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Last page button */}
        <Button
          variant={currentPage === totalPages ? "ghost" : "outline"}
          size="icon"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-9 w-9 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:bg-primary/10 disabled:opacity-50"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Page indicator badge */}
      <div className="bg-primary/10 text-primary text-xs font-major tracking-widest uppercase px-5 py-2 rounded-full border border-primary/30 shadow-md flex items-center space-x-2 transform hover:scale-105 transition-all duration-300">
        <span className="text-primary/60">Page</span>
        <span className="font-bold text-primary">{currentPage}</span>
        <span className="text-primary/60">of</span>
        <span className="font-bold text-primary">{totalPages}</span>
      </div>
    </div>
  );
}