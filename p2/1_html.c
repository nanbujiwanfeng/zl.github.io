#include<stdio.h>
#include <stdlib.h>
#include <string.h>
// 定义用户结构体（存储用户名和密码）
typedef struct {
    char username[20];  // 用户名（最大19个字符）
    char password[20];  // 密码（最大19个字符）
} User;

#define MAX_USER_NUM 10  // 最大支持10个用户
#define FILE_NAME "user_data.dat"  // 存储用户数据的文件

// 1. 初始化用户数据（首次运行时写入预设用户到文件）
void initUserList() {
    // 尝试以读方式打开文件，判断是否已存在
    FILE *fp = fopen(FILE_NAME, "rb");
    if (fp == NULL) {
        // 文件不存在，创建并写入预设用户（结构体数组）
        User defaultUsers[] = {
            {"admin", "123456"},   // 预设用户1
            {"testuser", "test123"}// 预设用户2
        };
        int defaultCount = sizeof(defaultUsers) / sizeof(User);  // 预设用户数量

        // 以二进制写方式打开文件
        fp = fopen(FILE_NAME, "wb");
        if (fp == NULL) {
            printf("文件创建失败！\n");
            exit(1);  // 退出程序
        }

        // 将预设用户数组写入文件
        fwrite(defaultUsers, sizeof(User), defaultCount, fp);
        fclose(fp);
        printf("初始化预设用户成功！\n");
    } else {
        fclose(fp);  // 文件已存在，直接关闭
    }
}
// 2. 从文件读取用户数据到结构体数组，返回实际用户数量
int loadUsers(User users[]) {
    FILE *fp = fopen(FILE_NAME, "rb");
    if (fp == NULL) {
        printf("读取用户数据失败！\n");
        return 0;
    }

    // 读取文件中的所有用户到数组（最多MAX_USER_NUM个）
    int userCount = fread(users, sizeof(User), MAX_USER_NUM, fp);
    fclose(fp);
    return userCount;
}

// 3. 登录验证函数
int login(User users[], int userCount) {
    char inputName[20], inputPwd[20];
    printf("\n===== 用户登录 =====\n");
    printf("请输入用户名：");
    scanf("%s", inputName);  // 读取用户名（不含空格）
    printf("请输入密码：");
    scanf("%s", inputPwd);   // 读取密码

    // 遍历结构体数组，验证用户名和密码
    for (int i = 0; i < userCount; i++) {
        if (strcmp(users[i].username, inputName) == 0 && 
            strcmp(users[i].password, inputPwd) == 0) {
            printf("登录成功！欢迎你，%s！\n", inputName);
            return 1;  // 登录成功返回1
        }
    }

    printf("登录失败！用户名或密码错误！\n");
    return 0;  // 登录失败返回0
}
// 主函数（程序入口）
int main() {
    User userList[MAX_USER_NUM];  // 结构体数组，存储所有用户
    int userCount;

    // 初始化用户数据（首次运行创建预设用户）
    initUserList();

    // 从文件加载用户数据到数组
    userCount = loadUsers(userList);
    if (userCount == 0) {
        return 1;  // 加载失败，退出程序
    }

    // 执行登录逻辑
    login(userList, userCount);

    return 0;
}