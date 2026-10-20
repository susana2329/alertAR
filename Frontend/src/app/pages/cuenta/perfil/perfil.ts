import { Component, OnInit  } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, Router} from "@angular/router";

import { MOCK_USER } from '../../../mocks/usuario.mock';

import { IonContent,IonHeader,IonToolbar,IonTitle,IonButtons,IonButton,IonIcon,IonTabBar,IonTabButton,IonLabel, AlertController } from "@ionic/angular";
import { addIcons } from "ionicons";
import { chevronBackOutline, cameraOutline, informationCircleOutline, personOutline, mailOutline, logoGoogle, homeOutline,mapOutline, fileTrayFullOutline,shieldOutline, text} from "ionicons/icons";


@Component({
    selector: 'app-perfil',
    templateUrl: './perfil.html',
    styleUrls: ['./perfil.scss'],
    standalone: true,
    imports:[
        CommonModule,
        RouterLink,
        IonContent,
        IonHeader,
        IonToolbar,
        IonTitle,
        IonButtons,
        IonButton,
        IonIcon,
        IonToolbar,
        IonTabButton,
        IonLabel,
        IonTabBar,
    ]
})

export class PerfilPage implements OnInit{

    user = MOCK_USER;
    constructor (
    private alertController: AlertController,
    private router: Router
    ){
        addIcons({
            chevronBackOutline,
            cameraOutline,
            informationCircleOutline,
            personOutline,
            mailOutline,
            logoGoogle,
            homeOutline,
            mapOutline,
            fileTrayFullOutline,
            shieldOutline
            
        });
    }

    ngOnInit(): void {}

    async confirmarEliminarCuenta(){
        const alert = await this.alertController.create({
            header: '¿Estás seguro?',
            message:'Esta acción eliminará tu cuenta de AlertAR de forma permanente.',
            buttons:[{
                text: 'Cancelar',
                role: 'cancele',
                cssClass: 'secondary',
                handler:()=>{
                console.log('Eliminación cancelada');
                }
            },
            {
                text: 'Si, eliminar cuenta',
                cssClass: 'danger-alert-button',
                handler: ()=>{
                    this.router.navigate(['/home']);
                }
            }
        ]
        });
        await alert.present();
    }
}
