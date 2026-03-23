#include <stdio.h>
#include <string.h>
int main()
{
    int arr[] = { 1,2,3,4,5,6,7,8,9,10 };
    memmove(&arr[2], &arr[0], 5 * sizeof(int));
    for (int i = 0; i < 10; i++) {
        printf("%d ", arr[i]);
    }
    return 0;
}