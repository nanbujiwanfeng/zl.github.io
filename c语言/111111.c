#include <stdio.h>
int sum(int n){
   if(n==1){
    sum=1;
   }
   return 1;
   else{
    sum=n+sum(n-1);
   }
   return sum;
}
int main(){
    int n=10;
    sum(n);
    printf("%d",sum);
}
    return 0;
}
