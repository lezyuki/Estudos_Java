import java.util.Scanner;
public class CalculoDeMedia {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Sua primeira nota: ");
        double nota1 = input.nextDouble();

        System.out.println("Sua segunda nota ");
        double nota2 = input.nextDouble();

        System.out.println("Sua terceira nota ");
        double nota3 = input.nextDouble();

        double media = (nota1 + nota2 + nota3) / 3;

        System.out.printf("Sua média foi: %.1f e você foi: ", media);

        if (media < 7 ) {
            System.out.println("REPROVADO!");
        } else if (media >= 7 ) {
            System.out.println("APROVADO!");
        }


        input.close();
    }
}
