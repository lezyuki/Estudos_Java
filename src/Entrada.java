import java.util.Scanner;

public class Entrada {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Digite eu nome: ");
        String nome = input.nextLine();

        System.out.println("Digite sua idade: ");
        int idade = input.nextInt();

        System.out.println("Olá " + nome + ", você tem " + idade + " anos.");

        input.close();
    }
}
