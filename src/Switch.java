import java.util.Scanner;

public class Switch {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Escolha seu jogo preferido!");
        System.out.println("1- Minecraft");
        System.out.println("2- Terraria");
        System.out.println("3- Forza");
        System.out.printf("Escolha sua resposta: ");

        int escolha = input.nextInt();

        switch (escolha) {
            case 1:
                System.out.println("Otimo minecraft é zika");
                break;
            case 2:
                System.out.println("Terraria é muito bom!");
                break;
            case 3:
                System.out.println("Forza é ótimo!");
                break;
            default:
                System.out.println("Escolha uma opção válida!");
        }


        input.close();
    }
}
